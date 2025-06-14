import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses } from "../web3";

const RedeemShares = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [redeemableAssets, setRedeemableAssets] = useState({
    vPls: "0",
    plsx: "0",
    inc: "0",
  });
  const [userBalance, setUserBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tokenDecimals = {
    vPLS: 18,
    PLSX: 18,
    INC: 18,
  };

  const fromUnits = (balance, decimals) => {
    try {
      if (!balance || balance === "0") return "0";
      return web3.utils.fromWei(balance.toString(), "ether");
    } catch (err) {
      console.error("Error converting balance:", { balance, decimals, error: err.message });
      return "0";
    }
  };

  const tokenConfig = {
    xBOND: { symbol: "PLSX", address: tokenAddresses[369].PLSX, redeemMethod: "redeemShares", abi: null },
    iBOND: { symbol: "INC", address: tokenAddresses[369].INC, redeemMethod: "redeemShares", abi: null },
    PLSTR: [
      { symbol: "vPLS", address: tokenAddresses[369].vPLS, abi: null },
    ],
  };

  const isPLSTR = contractSymbol === "PLSTR";
  const tokens = isPLSTR ? tokenConfig.PLSTR : [tokenConfig[contractSymbol]];

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
      const balance = await contract.methods.balanceOf(account).call();
      setUserBalance(fromUnits(balance, 18));
    } catch (err) {
      setError(`Failed to load balance: ${err.message}`);
    }
  };

  const fetchRedeemableAssets = async () => {
    if (!web3 || !contract || !amount || Number(amount) <= 0 || chainId !== 369) {
      setRedeemableAssets({ vPls: "0", plsx: "0", inc: "0" });
      return;
    }
    try {
      const shareAmount = web3.utils.toWei(amount, "ether");
      let assets = { vPls: "0", plsx: "0", inc: "0" };

      if (isPLSTR) {
        const vPlsBalance = await contract.methods.getContractMetrics().call(); // Adjust based on actual method
        assets.vPls = fromUnits(vPlsBalance[1], tokenDecimals.vPLS); // Assuming vPlsBalance is index 1
      } else {
        const token = tokens[0];
        const redeemable = await contract.methods[token.redeemMethod](shareAmount).call(); // Placeholder, adjust if needed
        assets[token.symbol.toLowerCase()] = fromUnits(redeemable, tokenDecimals[token.symbol]);
      }

      setRedeemableAssets(assets);
    } catch (err) {
      setError(`Failed to load redeemable assets: ${err.message}`);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchUserData();
  }, [web3, contract, account, chainId, contractSymbol]);

  useEffect(() => {
    if (web3 && contract && amount && chainId === 369) fetchRedeemableAssets();
  }, [amount, web3, contract, chainId, contractSymbol]);

  const handleRedeemShares = async () => {
    if (!amount || Number(amount) <= 0 || Number(amount) > Number(userBalance)) {
      setError("Please enter a valid amount within your balance");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const shareAmount = web3.utils.toWei(amount, "ether");
      const redeemMethod = isPLSTR ? "redeemPLSTR" : "redeemShares";
      await contract.methods[redeemMethod](shareAmount).send({ from: account });
      const redemptionMessage = isPLSTR
        ? `Successfully redeemed ${amount} ${contractSymbol} for ${formatNumber(redeemableAssets.vPls)} vPLS!`
        : `Successfully redeemed ${amount} ${contractSymbol} for ${formatNumber(redeemableAssets[tokens[0].symbol.toLowerCase()])} ${tokens[0].symbol}!`;
      alert(redemptionMessage);
      setAmount("");
      setDisplayAmount("");
      setRedeemableAssets({ vPls: "0", plsx: "0", inc: "0" });
      fetchUserData();
    } catch (err) {
      setError(`Error redeeming shares: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369) return null;

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Redeem {contractSymbol}</h2>
      <p className="text-gray-600 mb-2">
        Your {contractSymbol} Balance: <span className="text-[#4B0082]">{formatNumber(userBalance)} {contractSymbol}</span>
      </p>
      <div className="mb-4">
        <label className="text-gray-600">Amount ({contractSymbol})</label>
        <input
          type="text"
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder={`Enter ${contractSymbol} amount`}
          className="w-full p-2 border rounded-lg"
          disabled={loading}
        />
        {Array.isArray(tokens) && tokens.length > 0 ? (
          tokens.map((token) => (
            <p key={token.symbol} className="text-gray-600 mt-2">
              Redeemable {token.symbol}:{" "}
              <span className="text-[#4B0082]">{formatNumber(redeemableAssets[token.symbol.toLowerCase()])} {token.symbol}</span>
            </p>
          ))
        ) : (
          <p className="text-gray-600 mt-2">No redeemable assets available</p>
        )}
      </div>
      <button
        onClick={handleRedeemShares}
        disabled={loading || !amount || Number(amount) <= 0 || Number(amount) > Number(userBalance)}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Redeem"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default RedeemShares;
