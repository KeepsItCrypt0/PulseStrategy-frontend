import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses } from "../web3";

const IssueShares = ({ web3, contract, account, chainId, contractSymbol }) => {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tokenConfig = {
    xBOND: [{ symbol: "PLSX", address: tokenAddresses[369].PLSX, decimals: 18, abi: tokenAddresses[369].PLSX_ABI }],
    iBOND: [{ symbol: "INC", address: tokenAddresses[369].INC, decimals: 18, abi: tokenAddresses[369].INC_ABI }],
  };

  const tokens = tokenConfig[contractSymbol] || [];
  const defaultToken = tokens[0]?.symbol || "";

  const toTokenUnits = (amount, decimals) => {
    try {
      if (!amount || Number(amount) <= 0) return "0";
      return web3.utils.toWei(amount, "ether");
    } catch (err) {
      console.error("Error converting amount to token units:", { amount, decimals, err });
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

  useEffect(() => {
    setSelectedToken(defaultToken);
  }, [contractSymbol, defaultToken]);

  if (chainId !== 369 || !["xBOND", "iBOND"].includes(contractSymbol)) return null;

  const handleIssueShares = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = tokens[0];
      const tokenAmount = toTokenUnits(amount, token.decimals);
      const tokenContract = new web3.eth.Contract(token.abi, token.address);
      const allowance = await tokenContract.methods.allowance(account, contract.options.address).call();
      if (BigInt(allowance) < BigInt(tokenAmount)) {
        await tokenContract.methods.approve(contract.options.address, tokenAmount).send({ from: account });
      }
      await contract.methods.issueShares(tokenAmount).send({ from: account });
      alert(`Successfully issued ${contractSymbol} with ${amount} ${token.symbol}!`);
      setAmount("");
      setDisplayAmount("");
    } catch (err) {
      setError(`Error issuing shares: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const estimatedShares = amount ? (Number(amount) * 0.955).toFixed(6): // 4.5% fee
  const feeAmount = amount ? (Number(amount) * 0.045).toFixed(6);

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Issue {contractSymbol}</h2>
      <div className="mb-4">
        <label className="text-gray-600">Token</label>
        <input
          type="text"
          value={defaultToken}
          readOnly
          className="w-full p-2 border rounded-lg bg-gray-100"
        />
      </div>
      <div className="mb-4">
        <label className="text-gray-600">Amount ({defaultToken})</label>
        <input
          type="text"
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder={`Enter ${defaultToken} amount`}
          className="w-full p-2 border rounded-lg"
          disabled={loading}
        />
        <p className="text-gray-600 mt-2">
          Estimated {contractSymbol} (after 4.5% fee): <span className="text-[#4B0082]">{formatNumber(estimatedShares)}</span>
        </p>
        <p className="text-gray-600 mt-1">
          Fee (4.5%): <span className="text-[#4B0082]">{formatNumber(feeAmount)} {defaultToken}</span>
        </p>
      </div>
      <button
        onClick={handleIssueShares}
        disabled={loading || !amount || Number(amount) <= 0}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Issue"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default IssueShares;
