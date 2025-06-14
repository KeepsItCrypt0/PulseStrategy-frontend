import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses, vPLS_ABI } from "../web3";

const DepositTokens = ({ web3, contract, account, chainId, contractSymbol }) => {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [vPlsBalance, setVPlsBalance] = useState("0");
  const [isController, setIsController] = useState(false);
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

  const fetchUserData = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      // Fetch vPLS balance
      const vPlsContract = new web3.eth.Contract(vPLS_ABI, tokenAddresses[369].vPLS);
      const balance = await vPlsContract.methods.balanceOf(account).call();
      setVPlsBalance(fromUnits(balance));

      // Check if account is strategy controller
      const controller = await contract.methods._strategyController().call();
      setIsController(controller.toLowerCase() === account.toLowerCase());
    } catch (err) {
      setError(`Failed to load user data: ${err.message}`);
      console.error("Fetch user data error:", err);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchUserData();
  }, [web3, contract, account, chainId]);

  const handleDepositTokens = async () => {
    if (!isController) {
      setError("Only the strategy controller can deposit vPLS");
      return;
    }
    if (!amount || Number(amount) <= 0 || Number(amount) > Number(vPlsBalance)) {
      setError("Please enter a valid amount within your vPLS balance");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const vPlsAmount = toTokenUnits(amount);
      const vPlsContract = new web3.eth.Contract(vPLS_ABI, tokenAddresses[369].vPLS);
      const allowance = await vPlsContract.methods.allowance(account, contract.options.address).call();
      if (BigInt(allowance) < BigInt(vPlsAmount)) {
        await vPlsContract.methods.approve(contract.options.address, vPlsAmount).send({ from: account });
      }
      await contract.methods.depositTokens(vPlsAmount).send({ from: account });
      alert(`Successfully deposited ${amount} vPLS!`);
      setAmount("");
      setDisplayAmount("");
      fetchUserData(); // Refresh balance
    } catch (err) {
      setError(`Error depositing tokens: ${err.message}`);
      console.error("Deposit error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369 || contractSymbol !== "PLSTR") return null;

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Deposit vPLS (Controller Only)</h2>
      <p className="text-gray-600 mb-2">
        vPLS Balance: <span className="text-[#4B0082]">{formatNumber(vPlsBalance)} vPLS</span>
      </p>
      <div className="mb-4">
        <label className="text-gray-600">Amount (vPLS)</label>
        <input
          type="text"
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder="Enter vPLS amount"
          className="w-full p-2 border rounded-lg"
          disabled={loading || !isController}
        />
      </div>
      <button
        onClick={handleDepositTokens}
        disabled={loading || !amount || Number(amount) <= 0 || !isController}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Deposit vPLS"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
      {!isController && (
        <p className="text-[#8B0000] mt-2">Only the strategy controller can deposit vPLS tokens.</p>
      )}
    </div>
  );
};

export default DepositTokens;
