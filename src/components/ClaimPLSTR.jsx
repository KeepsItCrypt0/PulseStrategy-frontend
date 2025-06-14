import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";

const ClaimPLSTR = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [pendingPLSTR, setPendingPLSTR] = useState("0");
  const [xBondBalance, setXBondBalance] = useState("0");
  const [iBondBalance, setIBondBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPendingPLSTR = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      const [claimablePLSTR, xBondBal, iBondBal, lastClaimedIndex, currentIndex] = await contract.methods.getClaimEligibility(account).call();
      console.log("getClaimEligibility result:", {
        account,
        claimablePLSTR,
        xBondBalance: xBondBal,
        iBondBalance: iBondBal,
        lastClaimedDepositIndex: lastClaimedIndex,
        currentDepositIndex: currentIndex,
        contractAddress: contract.options.address,
      });
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
      <p className="text-gray-600 mb-2">
        xBOND Balance: <span className="text-[#4B0082]">{formatNumber(xBondBalance)} xBOND</span>
      </p>
      <p className="text-gray-600 mb-2">
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
