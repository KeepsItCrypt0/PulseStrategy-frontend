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

  const tokenDecimals = {
    vPLS: 18,
    PLSX: 18,
    INC: 18,
    PLSTR: 18,
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

  const bondConfig = {
    xBOND: { token: "PLSX", redeemMethod: "getRedeemablePLSX", balanceField: "plsxBalance" },
    iBOND: { token: "INC", redeemMethod: "getRedeemableINC", balanceField: "incBalance" },
  };

  const fetchUserData = async () => {
    if (!web3 || !contract || !account || chainId !== 369) return;
    try {
      setLoading(true);
      setError("");

      const balance = await contract.methods.balanceOf(account).call();
      let data = {
        balance: fromUnits(balance, 18),
        redeemableToken: "0",
        vPlsBalance: "0",
        plsxBalance: "0",
        incBalance: "0",
        xBondClaimable: "0",
        iBondClaimable: "0",
      };

      if (contractSymbol !== "PLSTR" && balance !== "0") {
        const config = bondConfig[contractSymbol];
        const redeemable = await contract.methods[config.redeemMethod](balance).call();
        data.redeemableToken = fromUnits(redeemable, tokenDecimals[config.token]);
      }

      const tokenAddrs = tokenAddresses[369];
      if (contractSymbol !== "PLSTR") {
        if (tokenAddrs.vPLS) {
          const vPlsContract = new web3.eth.Contract(null, tokenAddrs.vPLS);
          const vPlsBalance = await vPlsContract.methods.balanceOf(account).call();
          data.vPlsBalance = fromUnits(vPlsBalance, tokenDecimals.vPLS);
        }
        if (tokenAddrs.PLSX) {
          const plsxContract = new web3.eth.Contract(null, tokenAddrs.PLSX);
          const plsxBalance = await plsxContract.methods.balanceOf(account).call();
          data.plsxBalance = fromUnits(plsxBalance, tokenDecimals.PLSX);
        }
        if (tokenAddrs.INC) {
          const incContract = new web3.eth.Contract(null, tokenAddrs.INC);
          const incBalance = await incContract.methods.balanceOf(account).call();
          data.incBalance = fromUnits(incBalance, tokenDecimals.INC);
        }
      } else {
        const xBondAddress = tokenAddrs.PLSX; // Using PLSX as a placeholder for xBond
        const iBondAddress = tokenAddrs.INC;  // Using INC as a placeholder for iBond
        if (xBondAddress) {
          const claimablePLSTR = await contract.methods.getClaimEligibility(account).call(); // Adjust based on actual method
          data.xBondClaimable = fromUnits(claimablePLSTR[1], tokenDecimals.PLSTR); // Adjust index based on getClaimEligibility return
        }
        if (iBondAddress) {
          const claimablePLSTR = await contract.methods.getClaimEligibility(account).call(); // Adjust based on actual method
          data.iBondClaimable = fromUnits(claimablePLSTR[2], tokenDecimals.PLSTR); // Adjust index based on getClaimEligibility return
        }
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

  const config = bondConfig[contractSymbol] || bondConfig.xBOND;
  const tokenSymbol = config ? config.token : "vPLS";
  const tokenBalance = userData[config ? config.balanceField : "vPlsBalance"] || "0";

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
              <p className="text-gray-600">Redeemable {tokenSymbol}: <span className="text-[#4B0082]">{formatNumber(userData.redeemableToken)} {tokenSymbol}</span></p>
              <p className="text-gray-600">{tokenSymbol} Balance: <span className="text-[#4B0082]">{formatNumber(tokenBalance)} {tokenSymbol}</span></p>
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
