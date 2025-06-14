import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses, xBOND_ABI, iBOND_ABI } from "../web3";

const UserInfo = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [userData, setUserData] = useState({
    balance: "0",
    redeemablePLSX: "0",
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
        redeemablePLSX: "0",
        claimablePLSTR: "0",
        xBondBalance: "0",
        iBondBalance: "0",
      };

      const tokenAddrs = tokenAddresses[369];
      if (contractSymbol !== "PLSTR") {
        // Determine ABI based on contractSymbol
        const bondABI = contractSymbol === "xBond" ? xBondABI : iBondABI;
        const bondContract = new web3.eth.Contract(bondABI, contract.options.address);
        const metrics = await bondContract.methods.getContractMetrics().call();
        
        let backingRatio = "0";
        if (contractSymbol === "xBond") {
          backingRatio = metrics.plsxBackingRatio || metrics[4] || "0"; // PLSX per xBond
        } else {
          backingRatio = metrics.incBackingRatio || metrics[4] || "0"; // INC per iBond
        }

        // Calculate Redeemable PLSX
        let plsxAmount = "0";
        if (contractSymbol === "xBond") {
          // xBond: balance * plsxBackingRatio / 1e18
          plsxAmount = (BigInt(balance) * BigInt(backingRatio)) / BigInt(1e18);
        } else {
          // iBond: balance * incBackingRatio / 1e18 = INC, then INC to PLSX
          const incAmount = (BigInt(balance) * BigInt(backingRatio)) / BigInt(1e18);
          // Placeholder: 1 INC = 1 PLSX (update with INC/PLSX pair)
          plsxAmount = incAmount;
          // If INC/PLSX pair exists:
          /*
          const pairContract = new web3.eth.Contract(uniswapV2PairABI, tokenAddrs.incPlsxPair);
          const reserves = await pairContract.methods.getReserves().call();
          const reserveInc = reserves[tokenAddrs.INC < tokenAddrs.PLSX ? 0 : 1];
          const reservePlsx = reserves[tokenAddrs.INC < tokenAddrs.PLSX ? 1 : 0];
          const plsxPerInc = (BigInt(reservePlsx) * BigInt(1e18)) / BigInt(reserveInc);
          plsxAmount = (incAmount * plsxPerInc) / BigInt(1e18);
          */
        }

        data.redeemablePLSX = fromUnits(plsxAmount.toString());
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
          const xBondResult = await contract.methods.getPendingPLSTR(tokenAddrs.xBond, account).call();
          const iBondResult = await contract.methods.getPendingPLSTR(tokenAddrs.iBond, account).call();
          claimablePLSTR = (BigInt(xBondResult) + BigInt(iBondResult)).toString();
          xBondBalance = await new web3.eth.Contract(xBondABI, tokenAddrs.xBond).methods.balanceOf(account).call();
          iBondBalance = await new web3.eth.Contract(iBondABI, tokenAddrs.iBond).methods.balanceOf(account).call();
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
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">
        {contractSymbol === "PLSTR" ? "PLSTR" : contractSymbol === "xBond" ? "xBond" : "iBond"} User Info
      </h2>
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-[#8B0000]">{error}</p>
      ) : (
        <>
          {contractSymbol === "PLSTR" ? (
            <>
              <p className="text-gray-500">
                Balance: <span className="text-[#4B0082]">{formatNumber(userData.balance)} PLSTR</span>
              </p>
              <p className="text-gray-500">
                Claimable PLSTR: <span className="text-[#4B0082]">{formatNumber(userData.claimablePLSTR)} PLSTR</span>
              </p>
              <p className="text-gray-500">
                xBond Balance: <span className="text-[#4B0082]">{formatNumber(userData.xBondBalance)} xBond</span>
              </p>
              <p className="text-gray-500">
                iBond Balance: <span className="text-[#4B0082]">{formatNumber(userData.iBondBalance)} iBond</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-500">
                {contractSymbol === "xBond" ? "xBond" : "iBond"} Balance: <span className="text-[#4B0082]">{formatNumber(userData.balance)} {contractSymbol === "xBond" ? "xBond" : "iBond"}</span>
              </p>
              <p className="text-gray-500">
                Redeemable PLSX: <span className="text-[#4B0082]">{formatNumber(userData.redeemablePLSX)} PLSX</span>
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserInfo;
