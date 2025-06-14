import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses, vPLS_ABI, plsxABI, incABI } from "../web3";

const UserInfo = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [userData, setUserData] = useState({
    balance: "0",
    redeemableToken: "0",
    vPlsBalance: "0",
    plsxBalance: "0",
    incBalance: "0",
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
        redeemableToken: "0",
        vPlsBalance: "0",
        plsxBalance: "0",
        incBalance: "0",
        claimablePLSTR: "0",
        xBondBalance: "0",
        iBondBalance: "0",
      };

      const tokenAddrs = tokenAddresses[369];
      if (contractSymbol !== "PLSTR") {
        if (tokenAddrs.vPLS) {
          const vPlsContract = new web3.eth.Contract(vPLS_ABI, tokenAddrs.vPLS);
          const vPlsBalance = await vPlsContract.methods.balanceOf(account).call();
          data.vPlsBalance = fromUnits(vPlsBalance);
        }
        if (tokenAddrs.PLSX) {
          const plsxContract = new web3.eth.Contract(plsxABI, tokenAddrs.PLSX);
          const plsxBalance = await plsxContract.methods.balanceOf(account).call();
          data.plsxBalance = fromUnits(plsxBalance);
        }
        if (tokenAddrs.INC) {
          const incContract = new web3.eth.Contract(incABI, tokenAddrs.INC);
          const incBalance = await incContract.methods.balanceOf(account).call();
          data.incBalance = fromUnits(incBalance);
        }
      } else {
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
          xBondBalance = await new web3.eth.Contract(PLSTR_ABI, tokenAddrs.xBOND).methods.balanceOf(account).call();
          iBondBalance = await new web3.eth.Contract(PLSTR_ABI, tokenAddrs.iBOND).methods.balanceOf(account).call();
          console.log("getPendingPLSTR fallback parsed:", { claimablePLSTR, xBondBalance, iBondBalance });
        }

        if (isNaN(Number(claimablePLSTR)) || isNaN(Number(xBondBalance)) || isNaN(Number(iBondBalance))) {
          throw new Error(`Invalid number format: ${JSON.stringify({ claimablePLSTR, xBondBalance, iBondBalance })}`);
        }

        data.claimablePLSTR = fromUnits(claimablePLSTR);
        data.xBondBalance = fromUnits(xBondBalance);
        data.iBondBalance = fromUnits(iBondBalance);
      }

      setUserData(data);
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
          {contractSymbol !== "PLSTR" && (
            <>
              <p className="text-gray-500">
                vPLS Balance: <span className="text-[#4B0082]">{formatNumber(userData.vPlsBalance)} vPLS</span>
              </p>
              <p className="text-gray-500">
                PLSX Balance: <span className="text-[#4B0082]">{formatNumber(userData.plsxBalance)} PLSX</span>
              </p>
              <p className="text-gray-500">
                INC Balance: <span className="text-[#4B0082]">{formatNumber(userData.incBalance)} INC</span>
              </p>
            </>
          )}
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
