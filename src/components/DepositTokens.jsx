import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses } from "../web3";

const DepositTokens = ({ web3, contract, account, chainId, contractSymbol }) => {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
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

  const toTokenUnits = (amount) => {
    try {
      if (!amount || Number(amount) <= 0) return "0";
      return web3.utils.toWei(amount, "ether");
    } catch (err) {
      console.error("Error converting amount to token units:", { amount, err });
      return "0";
    }
  };

  const formatInputValue = (value) => {
    if (!value) return "";
    const num = Number(value.replace(/,/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 8,
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "" || /^[0-9]*\.?[0-9]*$/.test(rawValue)) {
      setAmount(rawValue);
      setDisplayAmount(formatInputValue(rawValue));
    }
  };

  const fetchUserBalance = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      const vPlsContract = new web3.eth.Contract(tokenAddresses[369].vPLS_ABI, tokenAddresses[369].vPLS);
      const balance = await vPlsContract.methods.balanceOf(account).call();
      console.log("vPLS Balance:", fromUnits(balance)); // Debug log
    } catch (err) {
      setError(`Failed to load vPLS balance: ${err.message}`);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchUserBalance();
  }, [web3, contract, account, chainId]);

  const handleDepositTokens = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const vPlsAmount = toTokenUnits(amount);
      const vPlsContract = new web3.eth.Contract(tokenAddresses[369].vPLS_ABI, tokenAddresses[369].vPLS);
      const allowance = await vPlsContract.methods.allowance(account, contract.options.address).call();
      if (BigInt(allowance) < BigInt(vPlsAmount)) {
        await vPlsContract.methods.approve(contract.options.address, vPlsAmount).send({ from: account });
      }
      await contract.methods.depositTokens(vPlsAmount).send({ from: account });
      alert(`Successfully deposited ${amount} vPLS!`);
      setAmount("");
      setDisplayAmount("");
    } catch (err) {
      setError(`Error depositing tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369 || contractSymbol !== "PLSTR") return null;

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Deposit vPLS</h2>
      <div className="mb-4">
        <label className="text-gray-600">Amount (vPLS)</label>
        <input
          type="text"
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder="Enter vPLS amount"
          className="w-full p-2 border rounded-lg"
          disabled={loading}
        />
      </div>
      <button
        onClick={handleDepositTokens}
        disabled={loading || !amount || Number(amount) <= 0}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Deposit vPLS"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default DepositTokens;
