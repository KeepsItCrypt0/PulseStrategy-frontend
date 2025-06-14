import { useState } from "react";

const WeightUpdate = ({ contract, account, web3, chainId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdateWeight = async () => {
    if (!window.confirm("Are you sure you want to update the iBond weight? This can only be done every 24 hours.")) return;
    setLoading(true);
    setError("");
    try {
      await contract.methods.updateWeight().send({ from: account });
      alert("iBond weight updated successfully!");
    } catch (err) {
      const errorMessage = err.message.includes("WeightUpdateTooSoon")
        ? "Weight update too soon; please wait 24 hours since the last update"
        : `Error updating weight: ${err.message}`;
      setError(errorMessage);
      console.error("Update weight error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369) return null;

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Update iBond Weight</h2>
      <button
        onClick={handleUpdateWeight}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Update Weight"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default WeightUpdate;
