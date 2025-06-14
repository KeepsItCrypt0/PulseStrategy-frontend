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
      iBondWeight: "0",
    },
    pairAddress: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tokenDecimals = {
    vPLS: 18,
    PLSX: 18,
    INC: 18,
  };

  const truncateAddress = (address) => {
    if (!address || typeof address !== "string" || address.length < 10) return "Not available";
    return `0x${address.slice(2, 6)}...${address.slice(-4)}`;
  };

  const isZeroAddress = (address) => {
    return address === "0x0000000000000000000000000000000000000000";
  };

  const fromUnits = (balance, decimals) => {
    try {
      if (!balance || balance === "0") return "0";
      const balanceStr = typeof balance === "bigint" ? balance.toString() : balance.toString();
      if (decimals === 18) {
        return web3.utils.fromWei(balanceStr, "ether");
      }
      return web3.utils.fromWei(balanceStr, "ether");
    } catch (err) {
      console.error("Error converting balance:", { balance, decimals, error: err.message });
      return "0";
    }
  };

  const fetchContractData = async () => {
    if (!contract || !web3 || chainId !== 369) return;
    try {
      setLoading(true);
      setError(null);

      const isPLSTR = contractSymbol === "PLSTR";
      const [totalSupply, metrics, pairAddress] = await Promise.all([
        contract.methods.totalSupply().call(),
        contract.methods.getContractMetrics().call(),
        contractSymbol !== "PLSTR" ? contract.methods.getPairAddress().call().catch(() => "") : Promise.resolve(""),
      ]);

      const data = {
        totalSupply: fromUnits(totalSupply, 18),
        metrics: isPLSTR
          ? {
              vPlsBalance: fromUnits(metrics[1], tokenDecimals.vPLS),
              plsxBalance: "0",
              incBalance: "0",
              totalMinted: fromUnits(metrics[2], 18),
              totalBurned: fromUnits(metrics[3], 18),
              iBondWeight: fromUnits(metrics[6], 18),
            }
          : {
              vPlsBalance: "0",
              plsxBalance: contractSymbol === "xBOND" ? fromUnits(metrics[1], tokenDecimals.PLSX) : "0",
              incBalance: contractSymbol === "iBOND" ? fromUnits(metrics[1], tokenDecimals.INC) : "0",
              totalMinted: fromUnits(metrics[2], 18),
              totalBurned: fromUnits(metrics[3], 18),
              iBondWeight: "0",
            },
        pairAddress: pairAddress || "",
      };

      setContractData(data);
    } catch (err) {
      console.error("Error fetching contract data:", err);
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
          <p className="text-gray-600">Total Supply: <span className="text-[#4B0082]">{formatNumber(contractData.totalSupply)} {contractSymbol}</span></p>
          <p className="text-gray-600">Total Minted: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.totalMinted)} {contractSymbol}</span></p>
          <p className="text-gray-600">Total Burned: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.totalBurned)} {contractSymbol}</span></p>
          {contractSymbol === "PLSTR" && (
            <>
              <p className="text-gray-600">vPLS Balance: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.vPlsBalance)} vPLS</span></p>
              <p className="text-gray-600">iBond Weight: <span className="text-[#4B0082]">{formatNumber(contractData.metrics.iBondWeight)}</span></p>
            </>
          )}
          {contractSymbol !== "PLSTR" && (
            <>
              <p className="text-gray-600">
                {contractSymbol === "xBOND" ? "PLSX" : "INC"} Balance: <span className="text-[#4B0082]">{formatNumber(contractSymbol === "xBOND" ? contractData.metrics.plsxBalance : contractData.metrics.incBalance)} {contractSymbol === "xBOND" ? "PLSX" : "INC"}</span>
              </p>
              {contractData.pairAddress && !isZeroAddress(contractData.pairAddress) && (
                <p className="text-gray-600">
                  Pair Address:{" "}
                  <span className="text-[#4B0082]">
                    <a
                      href={`https://kekxplorer.avecdra.pro/address/${contractData.pairAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline cursor-pointer"
                    >
                      {truncateAddress(contractData.pairAddress)}
                    </a>
                  </span>
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ContractInfo;
