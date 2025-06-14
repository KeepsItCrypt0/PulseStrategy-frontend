import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses, vPLS_ABI, plsxABI, incABI } from "../web3";

const UserInfo = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [userData, setUserData] = useState({
    balance: "0",
    redeemableValue: "0", // vPLS for PLSTR, PLSX for xBOND, INC for iBOND
    claimablePLSTR: "0",
    xBondBalance: "0",
    iBondBalance: "0",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fromUnits = (balance) => {
    try {
      if (!balance || balance === "0") return "0";
      return web3.utils.fromWei(balance.toString(), "ether");
    } catch (err) {
      console.error("Error converting balance:", { balance, error: err.message });
      return "0";
    }
  };

  const fetchUserData = async () => {
    if (!web3 || !contract || !account || chainId !== 369) {
      console.warn("fetchUserData: Invalid inputs", { web3: !!web3, contract: !!contract, account, chainId });
      return;
    }
    try {
      setLoading(true);
      setError("");

      const balance = await contract.methods.balanceOf(account).call();
      let data = {
        balance: fromUnits(balance),
        redeemableValue: "0",
        claimablePLSTR: "0",
        xBondBalance: "0",
        iBondBalance: "0",
      };

      const tokenAddrs = tokenAddresses[369];

      // Fetch redeemable value
      let backingTokenBalance, totalSupply, redeemableTokenSymbol;
      if (contractSymbol === "PLSTR") {
        const metrics = await contract.methods.getContractMetrics().call();
        console.log("getContractMetrics result for PLSTR:", { metrics });
        const { contractTotalSupply, vPlsBalance } = Array.isArray(metrics)
          ? { contractTotalSupply: metrics[0], vPlsBalance: metrics[1] }
          : metrics;
        totalSupply = contractTotalSupply;
        backingTokenBalance = vPlsBalance;
        redeemableTokenSymbol = "vPLS";
      } else if (contractSymbol === "xBOND" && tokenAddrs.PLSX) {
        try {
          const metrics = await contract.methods.getContractMetrics().call();
          console.log("getContractMetrics result for xBOND:", { metrics });
          const { contractTotalSupply, plsxBalance } = Array.isArray(metrics)
            ? { contractTotalSupply: metrics[0], plsxBalance: metrics[1] }
            : metrics;
          totalSupply = contractTotalSupply;
          backingTokenBalance = plsxBalance;
        } catch (err) {
          console.warn("getContractMetrics failed for xBOND, using balanceOf:", err.message);
          const plsxContract = new web3.eth.Contract(plsxABI, tokenAddrs.PLSX);
          backingTokenBalance = await plsxContract.methods.balanceOf(tokenAddrs.xBOND).call();
          totalSupply = await contract.methods.totalSupply().call();
        }
        redeemableTokenSymbol = "PLSX";
      } else if (contractSymbol === "iBOND" && tokenAddrs.INC) {
        try {
          const metrics = await contract.methods.getContractMetrics().call();
          console.log("getContractMetrics result for iBOND:", { metrics });
          const { contractTotalSupply, incBalance } = Array.isArray(metrics)
            ? { contractTotalSupply: metrics[0], incBalance: metrics[1] }
            : metrics;
          totalSupply = contractTotalSupply;
          backingTokenBalance = incBalance;
        } catch (err) {
          console.warn("getContractMetrics failed for iBOND, using balanceOf:", err.message);
          const incContract = new web3.eth.Contract(incABI, tokenAddrs.INC);
          backingTokenBalance = await incContract.methods.balanceOf(tokenAddrs.iBOND).call();
          totalSupply = await contract.methods.totalSupply().call();
        }
        redeemableTokenSymbol = "INC";
      }

      if (Number(totalSupply) > 0) {
        // Redeemable value = (balance * backingTokenBalance) / totalSupply
        const redeemable = (BigInt(balance) * BigInt(backingTokenBalance)) / BigInt(totalSupply);
        data.redeemableValue = fromUnits(redeemable.toString());
      }

      // Fetch PLSTR-specific data
      if (contractSymbol === "PLSTR") {
        let claimablePLSTR, xBondBalance, iBondBalance;
        try {
          const result = await contract.methods.getClaimEligibility(account).call();
          console.log("getClaimEligibility raw result:", { result, type: typeof result, account, contractAddress: contract.options.address });
          
          if (Array.isArray(result) && result.length === 5) {
            [claimablePLSTR, xBondBalance, iBondBalance, , ] = result;
            console.log("getClaimEligibility parsed as array:", { claimablePLSTR, xBondBalance, iBondBalance });
          } else if (typeof result === "object" && result !== null) {
            claimablePLSTR = result.claimablePLSTR || result[0] || "0";
            xBondBalance = result.xBondBalance || result[1] || "0";
            iBondBalance = result.iBondBalance || result[2] || "0";
            console.log("getClaimEligibility parsed as object:", { claimablePLSTR, xBondBalance, iBondBalance });
          } else {
            throw new Error("Unexpected getClaimEligibility result format");
          }
        } catch (err) {
          console.warn("getClaimEligibility failed, trying getPendingPLSTR:", err.message);
          const xBondResult = await contract.methods.getPendingPLSTR(tokenAddrs.xBOND, account).call();
          const iBondResult = await contract.methods.getPendingPLSTR(tokenAddrs.iBOND, account).call();
          claimablePLSTR = (BigInt(xBondResult) + BigInt(iBondResult)).toString();
          const xBondContract = new web3.eth.Contract(plsxABI, tokenAddrs.xBOND);
          const iBondContract = new web3.eth.Contract(incABI, tokenAddrs.iBOND);
          xBondBalance = await xBondContract.methods.balanceOf(account).call();
          iBondBalance = await iBondContract.methods.balanceOf(account).call();
          console.log("getPendingPLSTR fallback parsed:", { claimablePLSTR, xBondBalance, iBondBalance });
        }

        if (isNaN(Number(claimablePLSTR)) || isNaN(Number(xBondBalance)) || isNaN(Number(iBondBalance))) {
          throw new Error(`Invalid number format: ${JSON.stringify({ claimablePLSTR, xBondBalance, iBondBalance })}`);
        }

        data.claimablePLSTR = fromUnits(claimablePLSTR);
        data.xBondBalance = fromUnits(xBondBalance);
        data.iBondBalance = fromUnits(iBondBalance);
      }

      setUserData({ ...data, redeemableTokenSymbol });
    } catch (err) {
      setError(`Failed to load user data: ${err.message}`);
      console.error("Fetch user data error:", {
        error: err.message,
        account,
        contractAddress: contract.options.address,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchUserData();
  }, [web3, contract, account, chainId, contractSymbol]);

  if (chainId !== 369) {
    return (
      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
        <p className="text-[#8B0000]">Please connect to PulseChain (chain ID 369)</p>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">{contractSymbol} User Info</h2>
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-[#8B0000]">{error}</p>
      ) : (
        <>
          <p className="text-gray-500">
            Balance: <span className="text-[#4B0082]">{formatNumber(userData.balance)} {contractSymbol}</span>
          </p>
          <p className="text-gray-500">
            Redeemable Value: <span className="text-[#4B0082]">{formatNumber(userData.redeemableValue)} {userData.redeemableTokenSymbol}</span>
          </p>
          {contractSymbol === "PLSTR" && (
            <>
              <p className="text-gray-500">
                Claimable PLSTR: <span className="text-[#4B0082]">{formatNumber(userData.claimablePLSTR)} PLSTR</span>
              </p>
              <p className="text-gray-500">
                xBOND Balance: <span className="text-[#4B0082]">{formatNumber(userData.xBondBalance)} xBOND</span>
              </p>
              <p className="text-gray-500">
                iBOND Balance: <span className="text-[#4B0082]">{formatNumber(userData.iBondBalance)} iBOND</span>
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserInfo;
