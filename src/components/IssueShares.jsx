import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses, incABI, plsxABI, vPLS_ABI } from "../web3";

const IssueShares = ({ web3, contract, account, chainId, contractSymbol }) => {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState(""); // Formatted for display
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isController, setIsController] = useState(false);

  // Null checks for props
  if (!web3 || !contract || !account || !chainId || !contractSymbol) {
    console.warn("IssueShares: Missing required props", { web3, contract, account, chainId, contractSymbol });
    return <div className="text-gray-600 p-6">Loading contract data...</div>;
  }

  const tokenConfig = {
    xBond: [
      { symbol: "PLSX", address: tokenAddresses[369].PLSX, decimals: 18, abi: plsxABI },
    ],
    iBond: [
      { symbol: "INC", address: tokenAddresses[369].INC, decimals: 18, abi: incABI },
    ],
    PLSTR: [
      { symbol: "vPLS", address: tokenAddresses[369].vPLS, decimals: 18, abi: vPlsABI },
    ],
  };

  const isPLSTR = contractSymbol === "PLSTR";
  const tokens = tokenConfig[contractSymbol] || [];
  const defaultToken = tokens[0]?.symbol || "";

  if (!tokens.length) {
    console.error("IssueShares: Invalid token config", { contractSymbol });
    return <div className="text-red-600 p-6">Error: Invalid contract configuration</div>;
  }

  // Check if the user is the strategy controller for PLSTR
  useEffect(() => {
    const checkController = async () => {
      if (isPLSTR) {
        try {
          const controller = await contract.methods._strategyController().call();
          setIsController(controller.toLowerCase() === account.toLowerCase());
        } catch (err) {
          console.error("Error checking strategy controller:", err);
          setError("Failed to verify controller status");
        }
      }
    };
    checkController();
  }, [contract, account, isPLSTR]);

  // Convert amount to token's native units
  const toTokenUnits = (amount, decimals) => {
    try {
      if (!amount || Number(amount) <= 0) return "0";
      return web3.utils.toWei(amount, "ether");
    } catch (err) {
      console.error("Error converting amount to token units:", { amount, decimals, err });
      return "0";
    }
  };

  // Format input value with commas
  const formatInputValue = (value) => {
    if (!value) return "";
    const num = Number(value.replace(/,/g, ""));
    if (isNaN(num)) return value; // Allow partial input
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 18,
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Handle input change
  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, ""); // Strip commas
    if (rawValue === "" || /^[0-9]*\.?[0-9]*$/.test(rawValue)) {
      setAmount(rawValue);
      setDisplayAmount(formatInputValue(rawValue));
    }
  };

  useEffect(() => {
    console.log("IssueShares: Setting default token", { contractSymbol, defaultToken });
    return () => {
      console.log("IssueShares: Cleanup useEffect", { contractSymbol });
    };
  }, [contractSymbol, defaultToken]);

  if (chainId !== 369) {
    console.log("IssueShares: Invalid chainId", { chainId });
    return <div className="text-gray-600 p-6">Please connect to PulseChain</div>;
  }

  const handleIssueShares = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (isPLSTR && !isController) {
      setError("Only the strategy controller can deposit vPLS");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = tokens[0]; // Single token per contract
      const tokenAmount = toTokenUnits(amount, token.decimals);
      console.log("Token amount calculated:", { token: token.symbol, amount, tokenAmount, decimals: token.decimals });
      if (tokenAmount === "0") throw new Error("Invalid token amount");
      const tokenContract = new web3.eth.Contract(token.abi, token.address);
      const allowance = await tokenContract.methods.allowance(account, contract.options.address).call();
      if (BigInt(allowance) < BigInt(tokenAmount)) {
        await tokenContract.methods.approve(contract.options.address, tokenAmount).send({ from: account });
        console.log("Token approved:", { token: token.symbol, tokenAmount });
      }
      const method = isPLSTR ? "depositTokens" : "issueShares";
      if (!contract.methods[method]) {
        throw new Error(`Method ${method} not found in ${contractSymbol} contract`);
      }
      await contract.methods[method](tokenAmount).send({ from: account });
      alert(`Successfully ${isPLSTR ? "deposited vPLS for PLSTR" : `issued ${contractSymbol} shares`} with ${amount} ${token.symbol}!`);
      setAmount("");
      setDisplayAmount("");
    } catch (err) {
      setError(`Error ${isPLSTR ? "depositing tokens" : "issuing shares"}: ${err.message}`);
      console.error(`${isPLSTR ? "Deposit" : "Issue shares"} error:`, err);
    } finally {
      setLoading(false);
    }
  };

  const estimatedShares = amount ? (isPLSTR ? Number(amount) : Number(amount) * 0.955).toFixed(6) : "0";
  const feeAmount = amount && !isPLSTR ? (Number(amount) * 0.045).toFixed(6) : "0";

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-purple-600">
        {isPLSTR ? "Deposit vPLS (Strategy Controller Only)" : `Issue ${contractSymbol}`}
      </h2>
      {isPLSTR && (
        <p className="text-gray-600 mb-4">
          <span className="text-red-600">WARNING</span> Deposits are restricted to the strategy controller. PLSTR issued by the strategy controller is available to xBond and iBond holders in the claim PLSTR section.
        </p>
      )}
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
          disabled={loading || (isPLSTR && !isController)}
        />
        <p className="text-gray-600 mt-2">
          Estimated {contractSymbol}{!isPLSTR ? " (after 4.5% fee)" : ""}:{" "}
          <span className="text-purple-600">{formatNumber(estimatedShares)}</span>
        </p>
        {!isPLSTR && (
          <p className="text-gray-600 mt-1">
            Fee (4.5%): <span className="text-purple-600">{formatNumber(feeAmount)} {defaultToken}</span>
          </p>
        )}
      </div>
      <button
        onClick={handleIssueShares}
        disabled={loading || !amount || Number(amount) <= 0 || (isPLSTR && !isController)}
        className="btn-primary"
      >
        {loading ? "Processing..." : isPLSTR ? "Deposit" : "Issue"}
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
};

export default IssueShares;
