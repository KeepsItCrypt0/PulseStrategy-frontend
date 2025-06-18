import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses } from "../web3";

const RedeemShares = ({ contract, account, web3, chainId, contractSymbol, onTransactionSuccess }) => {
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

  const tokenConfig = {
    xBond: { symbol: "PLSX", address: tokenAddresses[369].PLSX, redeemMethod: "redeemShares" },
    iBond: { symbol: "INC", address: tokenAddresses[369].INC, redeemMethod: "redeemShares" },
    PLSTR: { symbol: "vPLS", address: tokenAddresses[369].vPLS, redeemMethod: "redeemPLSTR" },
  };

  const isPLSTR = contractSymbol === "PLSTR";
  const token = tokenConfig[contractSymbol];

  // Null checks for props
  if (!web3 || !contract || !account || !chainId || !contractSymbol || !token) {
    console.warn("RedeemShares: Missing required props or invalid token config", {
      web3,
      contract,
      account,
      chainId,
      contractSymbol,
      token,
    });
    return <div className="text-gray-600 p-6">Loading contract data...</div>;
  }

  const fromUnits = (balance, decimals) => {
    try {
      if (!balance || balance === "0") return "0";
      return web3.utils.fromWei(balance.toString(), "ether");
    } catch (err) {
      console.error("Error converting balance:", { balance, decimals, error: err.message });
      return "0";
    }
  };

  // Format input value with commas and preserve decimals
  const formatInputValue = (value) => {
    if (!value) return "";
    const [intPart, decPart] = value.replace(/,/g, "").split(".");
    // Avoid formatting '0' as '0,', show empty string if cleared
    if (intPart === undefined || intPart === "") return decPart !== undefined ? `.${decPart}` : "";
    const formattedInt = new Intl.NumberFormat("en-US").format(Number(intPart));
    return decPart !== undefined ? `${formattedInt}.${decPart}` : (intPart ? formattedInt : "");
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "" || /^[0-9]*\.?[0-9]*$/.test(rawValue)) {
      setAmount(rawValue);
      setDisplayAmount(formatInputValue(rawValue));
    }
  };

  const fetchUserData = async () => {
    try {
      const balance = await contract.methods.balanceOf(account).call();
      setUserBalance(fromUnits(balance, 18));
    } catch (err) {
      setError(`Failed to load balance: ${err.message}`);
      console.error("Error fetching user balance:", err);
    }
  };

  const fetchRedeemableAssets = async () => {
    if (!amount || Number(amount) <= 0) {
      setRedeemableAssets({ vPls: "0", plsx: "0", inc: "0" });
      return;
    }
    try {
      const shareAmount = web3.utils.toWei(amount, "ether");
      const metrics = await contract.methods.getContractMetrics().call();
      const contractTotalSupply = metrics[0]; // totalSupply
      const tokenBalance = metrics[1]; // plsxBalance, incBalance, or vPlsBalance
      let redeemableAmount = "0";

      if (BigInt(contractTotalSupply) !== BigInt(0) && BigInt(tokenBalance) !== BigInt(0)) {
        redeemableAmount = (BigInt(tokenBalance) * BigInt(shareAmount)) / BigInt(contractTotalSupply);
      }

      setRedeemableAssets({
        vPls: isPLSTR ? fromUnits(redeemableAmount, tokenDecimals.vPLS) : "0",
        plsx: contractSymbol === "xBond" ? fromUnits(redeemableAmount, tokenDecimals.PLSX) : "0",
        inc: contractSymbol === "iBond" ? fromUnits(redeemableAmount, tokenDecimals.INC) : "0",
      });
    } catch (err) {
      setError(`Failed to load redeemable assets: ${err.message}`);
      console.error("Error fetching redeemable assets:", err);
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
      await contract.methods[token.redeemMethod](shareAmount).send({ from: account });
      const redemptionMessage = `Successfully redeemed ${amount} ${contractSymbol} for ${formatNumber(
        redeemableAssets[token.symbol.toLowerCase()]
      )} ${token.symbol}!`;
      alert(redemptionMessage);
      setAmount("");
      setDisplayAmount("");
      setRedeemableAssets({ vPls: "0", plsx: "0", inc: "0" });
      fetchUserData();
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (err) {
      setError(`Error redeeming shares: ${err.message}`);
      console.error("Redeem shares error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (chainId !== 369) {
    console.log("RedeemShares: Invalid chainId", { chainId });
    return <div className="text-gray-600 p-6">Please connect to PulseChain</div>;
  }

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
        <p className="text-gray-600 mt-2">
          Redeemable {token.symbol}:{" "}
          <span className="text-[#4B0082]">{formatNumber(redeemableAssets[token.symbol.toLowerCase()])} {token.symbol}</span>
        </p>
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
