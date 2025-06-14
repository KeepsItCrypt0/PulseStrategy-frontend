import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";

const ClaimPLSTR = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [pendingPLSTR, setPendingPLSTR] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPendingPLSTR = async () => {
    if (!web3 || !contract || !account || chainId !== 369) {
      console.warn("ClaimPLSTR: Invalid props for fetchPendingPLSTR", {
        web3: !!web3,
        contract: !!contract,
        account,
        chainId,
      });
      return;
    }
    try {
      const result = await contract.methods.getClaimEligibility(account).call();
      console.log("getClaimEligibility result:", {
        result,
        account,
        contractAddress: contract.options.address,
      });

      // Handle both array and object return formats
      let claimablePLSTR;
      if (Array.isArray(result)) {
        [claimablePLSTR] = result;
      } else if (result && typeof result === "object") {
        claimablePLSTR = result.claimablePLSTR || result[0];
      } else {
        throw new Error("Unexpected getClaimEligibility return format");
      }

      // Ensure claimablePLSTR is a string to avoid fromWei errors
      if (!claimablePLSTR || typeof claimablePLSTR !== "string") {
        console.warn("Invalid claimablePLSTR value:", { claimablePLSTR });
        setPendingPLSTR("0");
        return;
      }

      setPendingPLSTR(web3.utils.fromWei(claimablePLSTR, "ether"));
      setError("");
    } catch (err) {
      console.error("Error fetching claimable PLSTR:", {
        error: err.message,
        account,
        contractAddress: contract.options.address,
      });
      setError(`Failed to load claimable PLSTR: ${err.message}`);
      setPendingPLSTR("0");
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) {
      fetchPendingPLSTR();
    }
  }, [web3, contract, account, chainId]);

  const handleClaim = async () => {
    if (!web3 || !contract || !account || chainId !== 369) {
      setError("Invalid configuration for claiming PLSTR");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await contract.methods.claimPLSTR().send({ from: account });
      alert(`Successfully claimed ${pendingPLSTR} PLSTR!`);
      setPendingPLSTR("0");
      await fetchPendingPLSTR();
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
      <p className="text-gray-600 mb-2">
        Pending PLSTR: <span className="text-[#4B0082]">{formatNumber(pendingPLSTR)} PLSTR</span>
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
