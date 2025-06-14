import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";

const ContractInfo = ({ contract, web3, chainId, contractSymbol }) => {
  const [contractData, setContractData] = useState({
    totalSupply: "0",
    metrics: {
      vPlsBalance: "0",
      plsxBalance: "0",
      incBalance: "0",
      totalMinted: "0",
      totalBurned: "0",
      avgPlstrPerBond: "0",
      plsxBackingRatio: "0",
      incBackingRatio: "0",
    },
    issuanceStatus: { isActive: false, timeRemaining: 0 }, // Added
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fromUnits = (balance) => {
    try {
      if (!balance || balance === "0") return "0";
      return web3.utils.fromWei(balance.toString(), "ether");
    } catch (err) {
      console.error("Error converting balance:", { balance, error: err.message });
      return "0";
    }
  };

  // Format time remaining (seconds) to days/hours
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "0";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  const fetchContractData = async () => {
    if (!contract || !web3 || chainId !== 369) return;
    try {
      setLoading(true);
      setError(null);

      const isPLSTR = contractSymbol === "PLSTR";
      const promises = [
        contract.methods.totalSupply().call(),
        contract.methods.getContractMetrics().call(),
      ];

      // Fetch issuance status only for xBOND and iBOND
      if (!isPLSTR) {
        promises.push(contract.methods.getIssuanceStatus().call());
      }

      const [totalSupply, metrics, issuanceStatus] = await Promise.all(promises);

      const data = {
        totalSupply: fromUnits(totalSupply),
        metrics: isPLSTR
          ? {
              vPlsBalance: fromUnits(metrics[1]),
              plsxBalance: "0",
              incBalance: "0",
              totalMinted: fromUnits(metrics[2]),
              totalBurned: fromUnits(metrics[3]),
              avgPlstrPerBond: fromUnits(metrics[6]),
            }
          : {
              vPlsBalance: "0",
              plsxBalance: contractSymbol === "xBOND" ? fromUnits(metrics[1]) : "0",
              incBalance: contractSymbol === "iBOND" ? fromUnits(metrics[1]) : "0",
              totalMinted: fromUnits(metrics[2]),
              totalBurned: fromUnits(metrics[3]),
              plsxBackingRatio: contractSymbol === "xBOND" ? fromUnits(metrics[4]) : "0",
              incBackingRatio: contractSymbol === "iBOND" ? fromUnits(metrics[4]) : "0",
            },
        issuanceStatus: isPLSTR
          ? { isActive: false, timeRemaining: 0 }
          : { isActive: issuanceStatus[0], timeRemaining: Number(issuanceStatus[1]) },
      };

      setContractData(data);
    } catch (err) {
      console.error("Error fetching contract data:", {
        error: err.message,
        contractSymbol,
      });
      setError(`Failed to load ${contractSymbol} data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && web3 && chainId === 369) {
      fetchContractData();
    }
  }, [contract, web3, chainId, contractSymbol]);

  if (chainId !== 369) {
    return (
      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
        <p className="text-[#8B0000]">Please connect to PulseChain (chain ID 369)</p>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">{contractSymbol} Contract Info</h2>
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-[#8B0000]">{error}</p>
      ) : (
        <>
          <h3 className="text-lg font-medium mt-4">Contract Details</h3>
          <p className="text-gray-600">
            Total Supply: <span className="text-[#4B0082]">{formatNumber(contractData.totalSupply)} {contractSymbol}</span>
          </p>
          <p className="text-gray-600">
            Total Minted: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.totalMinted)} {contractSymbol}</span>
          </p>
          <p className="text-gray-600">
            Total Burned: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.totalBurned)} {contractSymbol}</span>
          </p>
          {contractSymbol === "PLSTR" && (
            <>
              <p className="text-gray-600">
                vPLS Balance: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.vPlsBalance)} vPLS</span>
              </p>
              <p className="text-gray-600">
                Avg PLSTR per Bond: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.avgPlstrPerBond)}</span>
              </p>
            </>
          )}
          {contractSymbol !== "PLSTR" && (
            <>
              <p className="text-gray-600">
                {contractSymbol === "xBOND" ? "PLSX" : "INC"} Balance:{" "}
                <span className="text-[#4B0082]">
                  {formatNumber(contractSymbol === "xBOND" ? contractData.metrics.plsxBalance : contractData.metrics.incBalance)}{" "}
                  {contractSymbol === "xBOND" ? "PLSX" : "INC"}
                </span>
              </p>
              <p className="text-gray-600">
                Backing Ratio:{" "}
                <span className="text-[#4B0082]">
                  {formatNumber(contractSymbol === "xBOND" ? contractData.metrics.plsxBackingRatio : contractData.metrics.incBackingRatio)}
                </span>
              </p>
              <p className="text-gray-600">
                Issuance Status:{" "}
                <span className="text-[#4B0082]">
                  {contractData.issuanceStatus.isActive ? "Active" : "Ended"}
                </span>
              </p>
              <p className="text-gray-600">
                Time Remaining:{" "}
                <span className="text-[#4B0082]">
                  {contractData.issuanceStatus.isActive
                    ? formatTimeRemaining(contractData.issuanceStatus.timeRemaining)
                    : "0"}
                </span>
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ContractInfo;
