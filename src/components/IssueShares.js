import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses } from "../web3";

const IssueShares = ({ web3, contract, account, chainId, contractSymbol }) => {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!web3 || !contract || !account || !chainId || !contractSymbol) {
    console.warn("IssueShares: Missing required props", { web3, contract, account, chainId, contractSymbol });
    return <div className="text-gray-600 p-6">Loading contract data...</div>;
  }

  const tokenConfig = {
    PLSTR: [
      { symbol: "vPLS", address: tokenAddresses[369].vPLS, decimals: 18, abi: null },
    ],
    xBOND: [{ symbol: "PLSX", address: tokenAddresses[369].PLSX, decimals: 18, abi: null }],
    iBOND: [{ symbol: "INC", address: tokenAddresses[369].INC, decimals: 18, abi: null }],
  };

  const isPLSTR = contractSymbol === "PLSTR";
  const tokens = tokenConfig[contractSymbol] || [];
  const defaultToken = tokens[0]?.symbol || "";

  if (!tokens.length) {
    console.error("IssueShares: Invalid token config", { contractSymbol });
    return <div className="text-[#8B0000] p-6">Error: Invalid contract configuration</div>;
  }

  const toTokenUnits = (amount, decimals) => {
    try {
      if (!amount || Number(amount) <= 0) return "0";
      if (decimals === 18) {
        return web3.utils.toWei(amount, "ether");
      }
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
    setSelectedToken(isPLSTR ? "" : defaultToken);
  }, [contractSymbol, isPLSTR, defaultToken]);

  if (chainId !== 369) {
    console.log("IssueShares: Invalid chainId", { chainId });
    return <div className="text-gray-600 p-6">Please connect to PulseChain</div>;
  }

  const handleIssueShares = async () => {
    if (!amount || Number(amount) <= 0 || (isPLSTR && !selectedToken)) {
      setError(isPLSTR ? "Please enter a valid amount and select a token" : "Please enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = tokens.find((t) => t.symbol === (isPLSTR ? selectedToken : defaultToken));
      if (!token) throw new Error("Invalid token selected");
      const tokenAmount = toTokenUnits(amount, token.decimals);
      if (tokenAmount === "0") throw new Error("Invalid token amount");
      const tokenContract = new web3.eth.Contract(token.abi, token.address);
      const allowance = await tokenContract.methods.allowance(account, contract.options.address).call();
      if (BigInt(allowance) < BigInt(tokenAmount)) {
        await tokenContract.methods.approve(contract.options.address, tokenAmount).send({ from: account });
      }
      const issueMethod = isPLSTR ? "depositTokens" : "issueShares";
      if (!contract.methods[issueMethod]) {
        throw new Error(`Method ${issueMethod} not found in ${contractSymbol} contract`);
      }
      await contract.methods[issueMethod](tokenAmount).send({ from: account });
      alert(`Successfully issued ${contractSymbol} shares with ${amount} ${token.symbol}!`);
      setAmount("");
      setDisplayAmount("");
      if (isPLSTR) setSelectedToken("");
    } catch (err) {
      setError(`Error issuing shares: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const estimatedShares = amount ? (isPLSTR ? Number(amount) : Number(amount) * 0.955).toFixed(6);
  const feeAmount = amount && !isPLSTR ? (Number(amount) * 0.045).toFixed(6);

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">
        {isPLSTR ? "Strategy Controller Deposit (ONLY)" : `Issue ${contractSymbol}`}
      </h2>
      {isPLSTR ? (
        <>
          <p className="text-gray-600 mb-4">
            <span className="text-[#8B0000]">WARNING</span> Deposits are restricted to strategy controller. PLSTR issued by strategy controller is available to bondholders in the claim PLSTR section.
          </p>
          <div className="mb-4">
            <label className="text-gray-600">Select Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full p-2 border rounded-lg"
              disabled={loading}
            >
              <option value="">Select a token</option>
              {tokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div className="mb-4">
          <label className="text-gray-600">Token</label>
          <input
            type="text"
            value={defaultToken}
            readOnly
            className="w-full p-2 border rounded-lg bg-gray-100"
          />
        </div>
      )}
      <div className="mb-4">
        <label className="text-gray-600">Amount ({isPLSTR ? selectedToken || "Token" : defaultToken})</label>
        <input
          type="text"
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder={`Enter ${isPLSTR ? selectedToken || "token" : defaultToken} amount`}
          className="w-full p-2 border rounded-lg"
          disabled={loading}
        />
        <p className="text-gray-600 mt-2">
          Estimated {contractSymbol}{!isPLSTR ? " (after 4.5% fee)" : ""}:{" "}
          <span className="text-[#4B0082]">{formatNumber(estimatedShares)}</span>
        </p>
        {!isPLSTR && (
          <p className="text-gray-600 mt-1">
            Fee (4.5%): <span className="text-[#4B0082]">{formatNumber(feeAmount)} {defaultToken}</span>
          </p>
        )}
      </div>
      <button
        onClick={handleIssueShares}
        disabled={loading || !amount || Number(amount) <= 0 || (isPLSTR && !selectedToken)}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Issue"}
      </button>
      {error && <p className="text-[#8B0000] mt-2">{error}</p>}
    </div>
  );
};

export default IssueShares;
