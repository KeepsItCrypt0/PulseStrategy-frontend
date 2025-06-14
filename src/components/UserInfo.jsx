import { useState, useEffect } from "react";
import { formatNumber } from "../utils/format";
import { tokenAddresses } from "../web3";

const UserInfo = ({ contract, account, web3, chainId, contractSymbol }) => {
  const [userData, setUserData] = useState({
    balance: "0",
    redeemableToken: "0",
    vPlsBalance: "0",
    plsxBalance: "0",
    incBalance: "0",
    xBondClaimable: "0",
    iBondClaimable: "0",
  });
  const [loading, setLoading] = useState(true);
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

  const fetchUserData = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      setLoading(true);
      setError("");

      const balance = await contract.methods.balanceOf(account).call();
      let data = {
        balance: fromUnits(balance),
        redeemableToken: "0",
        vPlsBalance: "0",
        plsxBalance: "0",
        incBalance: "0",
        xBondClaimable: "0",
        iBondClaimable: "0",
      };

      if (contractSymbol !== "PLSTR" && balance !== "0") {
        const config = contractSymbol === "xBOND" ? { token: "PLSX" } : { token: "INC" };
        const redeemable = await contract.methods.redeemShares(balance).call(); // Adjust if a specific redeemable method exists
        data.redeemableToken = fromUnits(redeemable, 18);
      }

      const tokenAddrs = tokenAddresses[369];
      if (contractSymbol !== "PLSTR") {
        if (tokenAddrs.vPLS) {
          const vPlsContract = new web3.eth.Contract(null, tokenAddrs.vPLS);
          const vPlsBalance = await vPlsContract.methods.balanceOf(account).call();
          data.vPlsBalance = fromUnits(vPlsBalance);
        }
        if (tokenAddrs.PLSX) {
          const plsxContract = new web3.eth.Contract(null, tokenAddrs.PLSX);
          const plsxBalance = await plsxContract.methods.balanceOf(account).call();
          data.plsxBalance = fromUnits(plsxBalance);
        }
        if (tokenAddrs.INC) {
          const incContract = new web3.eth.Contract(null, tokenAddrs.INC);
          const incBalance = await incContract.methods.balanceOf(account).call();
          data.incBalance = fromUnits(incBalance);
        }
      } else {
        const [claimablePLSTR, xBondBalance, iBondBalance] = await contract.methods.getClaimEligibility(account).call();
        data.xBondClaimable = fromUnits(claimablePLSTR, 18); // Adjust index based on return structure
        data.iBondClaimable = fromUnits(claimablePLSTR, 18); // Adjust if separate claimable amounts are returned
      }

      setUserData(data);
    } catch (err) {
      setError(`Failed to load user data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (web3 && contract && account && chainId === 369) fetchUserData();
  }, [web3, contract, account, chainId, contractSymbol]);

  if (chainId !== 369) {
    return (
      <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
        <p className="text-[#8B0000]">Please connect to PulseChain (chain ID 369)</p>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 card">
      <h2 className="text-xl font-semibold mb-4 text-[#4B0082]">{contractSymbol} User Info</h2>
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-[#8B0000]">{error}</p>
      ) : (
        <>
          <p className="text-gray-600">Balance: <span className="text-[#4B0082]">{formatNumber(userData.balance)} {contractSymbol}</span></p>
          {contractSymbol !== "PLSTR" && (
            <>
              <p className="text-gray-600">Redeemable {contractSymbol === "xBOND" ? "PLSX" : "INC"}: <span className="text-[#4B0082]">{formatNumber(userData.redeemableToken)} {contractSymbol === "xBOND" ? "PLSX" : "INC"}</span></p>
              <p className="text-gray-600">vPLS Balance: <span className="text-[#4B0082]">{formatNumber(userData.vPlsBalance)} vPLS</span></p>
              <p className="text-gray-600">PLSX Balance: <span className="text-[#4B0082]">{formatNumber(userData.plsxBalance)} PLSX</span></p>
              <p className="text-gray-600">INC Balance: <span className="text-[#4B0082]">{formatNumber(userData.incBalance)} INC</span></p>
            </>
          )}
          {contractSymbol === "PLSTR" && (
            <>
              <p className="text-gray-600">Claimable PLSTR from xBOND: <span className="text-[#4B0082]">{formatNumber(userData.xBondClaimable)} PLSTR</span></p>
              <p className="text-gray-600">Claimable PLSTR from iBOND: <span className="text-[#4B0082]">{formatNumber(userData.iBondClaimable)} PLSTR</span></p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserInfo;
