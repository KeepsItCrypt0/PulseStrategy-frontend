import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";

const ClaimPLSTR = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [pendingPLSTR, setPendingPLSTR] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPendingPLSTR = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      const [claimablePLSTR] = await contract.methods.getClaimEligibility(account).call();
      setPendingPLSTR(web3.utils.fromWei(claimablePLSTR, "ether"));
    } catch (err) {
      setError(`Failed to load claimable PLSTR: ${err.message}`);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchPendingPLSTR();
  }, [web3, contract, account, chainId]);

  const handleClaim = async () => {
    setLoading(true);
    setError("");
    try {
      await contract.methods.claimPLSTR().send({ from: account });
      alert(`Successfully claimed ${pendingPLSTR} PLSTR!`);
      setPendingPLSTR("0");
      fetchPendingPLSTR();
    } catch (err) {
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
