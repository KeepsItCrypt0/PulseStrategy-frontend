import { useState, useEffect } from "react";
import { tokenAddresses, vPlsABI } from "../web3";

const AdminPanel = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [pairAddress, setPairAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [displayDepositAmount, setDisplayDepositAmount] = useState("");
  const [isController, setIsController] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Null checks for props
  if (!web3 || !contract || !account || !chainId || !contractSymbol) {
    console.warn("AdminPanel: Missing required props", {
      web3,
      contract,
      account,
      chainId,
      contractSymbol,
    });
    return <div className="text-gray-600 p-6">Loading contract data...</div>;
  }

  if (chainId !== 369) {
    console.log("AdminPanel: Invalid chainId", { chainId });
    return <div className="text-gray-600 p-6">Please connect to PulseChain</div>;
  }

  // Check if the user is the strategy controller
  useEffect(() => {
    const checkController = async () => {
      try {
        const controller = await contract.methods._strategyController().call();
        setIsController(controller.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error("Error checking strategy controller:", err);
        setError("Failed to verify controller status");
      }
    };
    checkController();
  }, [contract, account]);

  // Format input value with commas
  const formatInputValue = (value) => {
    if (!value) return "";
    const num = Number(value.replace(/,/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 18,
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Handle deposit amount change
  const handleDepositAmountChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "" || /^[0-9]*\.?[0-9]*$/.test(rawValue)) {
      setDepositAmount(rawValue);
      setDisplayDepositAmount(formatInputValue(rawValue));
    }
  };

  // Convert amount to vPLS units (18 decimals)
  const toTokenUnits = (amount) => {
    try {
      if (!amount || Number(amount) <= 0) return "0";
      return web3.utils.toWei(amount, "ether");
    } catch (err) {
      console.error("Error converting amount to token units:", { amount, err });
      return "0";
    }
  };

  const handleSetPairAddress = async () => {
    if (!pairAddress || !web3.utils.isAddress(pairAddress)) {
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
      console.error("Set pair address error:", err);
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
      console.error("Update weight error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositTokens = async () => {
    if (contractSymbol !== "PLSTR") return;
    if (!depositAmount || Number(depositAmount) <= 0) {
      setError("Please enter a valid vPLS amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tokenAmount = toTokenUnits(depositAmount);
      if (tokenAmount === "0") throw new Error("Invalid token amount");
      const tokenContract = new web3.eth.Contract(vPlsABI, tokenAddresses[369].vPLS);
      const allowance = await tokenContract.methods.allowance(account, contract.options.address).call();
      if (BigInt(allowance) < BigInt(tokenAmount)) {
        await tokenContract.methods.approve(contract.options.address, tokenAmount).send({ from: account });
        console.log("vPLS approved:", { tokenAmount });
      }
      await contract.methods.depositTokens(tokenAmount).send({ from: account });
      alert(`Successfully deposited ${depositAmount} vPLS for PLSTR!`);
      setDepositAmount("");
      setDisplayDepositAmount("");
    } catch (err) {
      setError(`Error depositing vPLS: ${err.message}`);
      console.error("Deposit tokens error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isController) {
    return (
      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
        <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Admin Panel - {contractSymbol}</h2>
        <p className="text-gray-600">Access restricted to the strategy controller.</p>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">Admin Panel - {contractSymbol}</h2>
      {contractSymbol !== "PLSTR" && (
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
            disabled={loading || !pairAddress || !web3.utils.isAddress(pairAddress)}
            className="btn-primary mb-4"
          >
            {loading ? "Processing..." : "Set Pair Address"}
          </button>
        </>
      )}
      {contractSymbol === "PLSTR" && (
        <>
          <h3 className="text-lg font-medium mb-2">Deposit vPLS</h3>
          <div className="mb-4">
            <label className="text-gray-600">Amount (vPLS)</label>
            <input
              type="text"
              value={displayDepositAmount}
              onChange={handleDepositAmountChange}
              placeholder="Enter vPLS amount"
              className="w-full p-2 border rounded-lg"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleDepositTokens}
            disabled={loading || !depositAmount || Number(depositAmount) <= 0}
            className="btn-primary mb-4"
          >
            {loading ? "Processing..." : "Deposit vPLS"}
          </button>
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
