import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";

const ClaimPLSTR = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [pendingPLSTR, setPendingPLSTR] = useState("0");
  const [xBondBalance, setXBondBalance] = useState("0");
  const [iBondBalance, setIBondBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPendingPLSTR = async () => {
    if (!web3 || !contract || !account || chainId !== 369) {
      console.warn("fetchPendingPLSTR: Invalid inputs", { web3: !!web3, contract: !!contract, account, chainId });
      return;
    }
    try {
      let claimablePLSTR, xBondBal, iBondBal;
      
      // Try getClaimEligibility first
      try {
        const result = await contract.methods.getClaimEligibility(account).call();
        console.log("getClaimEligibility raw result:", { result, type: typeof result, account, contractAddress: contract.options.address });
        
        if (Array.isArray(result) && result.length === 5) {
          [claimablePLSTR, xBondBal, iBondBal, , ] = result;
          console.log("getClaimEligibility parsed as array:", { claimablePLSTR, xBondBal, iBondBal });
        } else if (typeof result === "object" && result !== null) {
          claimablePLSTR = result.claimablePLSTR || result[0] || "0";
          xBondBal = result.xBondBalance || result[1] || "0";
          iBondBal = result.iBondBalance || result[2] || "0";
          console.log("getClaimEligibility parsed as object:", { claimablePLSTR, xBondBal, iBondBal });
        } else {
          throw new Error("Unexpected getClaimEligibility result format");
        }
      } catch (err) {
        console.warn("getClaimEligibility failed, trying getPendingPLSTR as fallback:", err.message);
        // Fallback to getPendingPLSTR for old contract
        const xBondResult = await contract.methods.getPendingPLSTR(tokenAddresses[369].xBOND, account).call();
        const iBondResult = await contract.methods.getPendingPLSTR(tokenAddresses[369].iBOND, account).call();
        claimablePLSTR = (BigInt(xBondResult) + BigInt(iBondResult)).toString();
        xBondBal = await new web3.eth.Contract(PLSTR_ABI, tokenAddresses[369].xBOND).methods.balanceOf(account).call();
        iBondBal = await new web3.eth.Contract(PLSTR_ABI, tokenAddresses[369].iBOND).methods.balanceOf(account).call();
        console.log("getPendingPLSTR fallback parsed:", { claimablePLSTR, xBondBal, iBondBal });
      }

      if (isNaN(Number(claimablePLSTR)) || isNaN(Number(xBondBal)) || isNaN(Number(iBondBal))) {
        throw new Error(`Invalid number format: ${JSON.stringify({ claimablePLSTR, xBondBal, iBondBal })}`);
      }

      setPendingPLSTR(web3.utils.fromWei(claimablePLSTR.toString(), "ether"));
      setXBondBalance(web3.utils.fromWei(xBondBal.toString(), "ether"));
      setIBondBalance(web3.utils.fromWei(iBondBal.toString(), "ether"));
    } catch (err) {
      console.error("Error fetching claimable PLSTR:", {
        error: err.message,
        account,
        contractAddress: contract.options.address,
      });
      setError(`Failed to load claimable PLSTR: ${err.message}`);
      setPendingPLSTR("0");
      setXBondBalance("0");
      setIBondBalance("0");
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchPendingPLSTR();
  }, [web3, contract, account, chainId]);

  const handleClaim = async () => {
    if (Number(pendingPLSTR) <= 0) {
      setError("No PLSTR available to claim");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Try claimPLSTR, fallback to claimAllPLSTR
      try {
        await contract.methods.claimPLSTR().send({ from: account });
      } catch (err) {
        console.warn("claimPLSTR failed, trying claimAllPLSTR:", err.message);
        await contract.methods.claimAllPLSTR(tokenAddresses[369].xBOND).send({ from: account });
        await contract.methods.claimAllPLSTR(tokenAddresses[369].iBOND).send({ from: account });
      }
      alert(`Successfully claimed ${pendingPLSTR} PLSTR!`);
      setPendingPLSTR("0");
      await fetchPendingPLSTR();
      console.log("PLSTR claimed:", { account, contractAddress: contract.options.address });
    } catch (err) {
      console.error("Error claiming PLSTR:", {
        error: err.message,
        account,
        contractAddress: contract.options.address,
      });
      setError(`Error claiming PLSTR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369 || contractSymbol !== "PLSTR") return null;

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Claim PLSTR</h2>
      <p className="text-gray-500 mb-2">
        Pending PLSTR: <span className="text-[#4B0082]">{formatNumber(pendingPLSTR)} PLSTR</span>
      </p>
      <p className="text-gray-500 mb-2">
        xBOND Balance: <span className="text-[#4B0082]">{formatNumber(xBondBalance)} xBOND</span>
      </p>
      <p className="text-gray-500 mb-2">
        iBOND Balance: <span className="text-[#4B0082]">{formatNumber(iBondBalance)} iBOND</span>
      </p>
      <button
        onClick={handleClaim}
        disabled={loading || Number(pendingPLSTR) <= 0}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Claim PLSTR"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default ClaimPLSTR;
