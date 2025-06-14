import { useState } from "react";

const AdminPanel = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [pairAddress, setPairAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!web3 || !contract || !account || !chainId || !contractSymbol) {
    console.warn("AdminPanel: Missing required props", { web3, contract, account, chainId, contractSymbol });
    return <div className="text-gray-600 p-6">Loading contract data...</div>;
  }

  if (chainId !== 369) {
    console.log("AdminPanel: Invalid chainId", { chainId });
    return <div className="text-gray-600 p-6">Please connect to PulseChain</div>;
  }

  const handleSetPairAddress = async () => {
    if (!pairAddress) {
      setError("Please enter a valid pair address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await contract.methods.setPairAddress(pairAddress).send({ from: account });
      alert("Pair address set successfully!");
      setPairAddress("");
    } catch (err) {
      setError(`Error setting pair address: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWeight = async () => {
    if (contractSymbol !== "PLSTR") return;
    setLoading(true);
    setError("");
    try {
      await contract.methods.updateWeight().send({ from: account });
      alert("Weight updated successfully!");
    } catch (err) {
      setError(`Error updating weight: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Admin Panel - {contractSymbol}</h2>
      {contractSymbol !== "PLSTR" ? (
        <>
          <h3 className="text-lg font-medium mb-2">Set Pair Address</h3>
          <div className="mb-4">
            <input
              type="text"
              value={pairAddress}
              onChange={(e) => setPairAddress(e.target.value)}
              placeholder="Enter pair address"
              className="w-full p-2 border rounded-lg"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSetPairAddress}
            disabled={loading || !pairAddress}
            className="btn-primary"
          >
            {loading ? "Processing..." : "Set Pair Address"}
          </button>
        </>
      ) : (
        <>
          <h3 className="text-lg font-medium mb-2">Update Weight</h3>
          <button
            onClick={handleUpdateWeight}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Processing..." : "Update Weight"}
          </button>
        </>
      )}
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default AdminPanel;
