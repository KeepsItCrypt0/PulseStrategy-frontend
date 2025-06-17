import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";

const SwapBurn = ({ web3, contract, account, chainId, contractSymbol }) => {
  const [accumulatedBalance, setAccumulatedBalance] = useState("0");
  const [loading, setLoading] = useState(false);
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

  const fetchAccumulatedBalance = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      setError("");
      const balance = await contract.methods.balanceOf(contract.options.address).call();
      setAccumulatedBalance(fromUnits(balance));
    } catch (err) {
      setError(`Failed to load contract balance: ${err.message}`);
      console.error("Fetch balance error:", err);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchAccumulatedBalance();
  }, [web3, contract, account, chainId, contractSymbol]);

  const handleBurn = async () => {
    if (!window.confirm(`Are you sure you want to burn accumulated ${contractSymbol}? This is irreversible.`)) return;
    setLoading(true);
    setError("");
    try {
      const burnFunction = contractSymbol === "xBond" ? "burnContractXBond" : "burnContractIBond";
      await contract.methods[burnFunction]().send({ from: account });
      alert(`Burned accumulated ${contractSymbol} successfully!`);
      fetchAccumulatedBalance();
    } catch (err) {
      setError(`Error burning tokens: ${err.message}`);
      console.error("Burn error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369 || contractSymbol === "PLSTR") return null;

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Burn {contractSymbol}</h2>
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          Accumulated {contractSymbol}: <span className="text-[#4B0082]">{formatNumber(accumulatedBalance)} {contractSymbol}</span>
        </p>
        <button
          onClick={handleBurn}
          disabled={loading || Number(accumulatedBalance) <= 0}
          className="btn-primary bg-[#8B0000] hover:bg-[#A52A2A]"
        >
          {loading ? "Processing..." : `Burn ${contractSymbol}`}
        </button>
      </div>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default SwapBurn;
