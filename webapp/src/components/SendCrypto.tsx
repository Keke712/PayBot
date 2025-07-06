import React, { useState, useEffect } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import "./SendCrypto.css";

interface Network {
  id: number;
  name: string;
  shortName: string;
  color: string;
  isTestnet: boolean;
  currency: string;
}

const networks: Network[] = [
  {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    color: "#ff6b35",
    isTestnet: true,
    currency: "SepoliaETH",
  },
  {
    id: 1,
    name: "Ethereum Mainnet",
    shortName: "Ethereum",
    color: "#627eea",
    isTestnet: false,
    currency: "ETH",
  },
];

const SendCrypto: React.FC = () => {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const navigate = useNavigate();

  const [selectedNetwork, setSelectedNetwork] = useState<Network>(networks[0]);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      navigate("/");
    }
  }, [authenticated, navigate]);

  const validateAddress = (address: string) => {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    // Validations
    if (!recipientAddress.trim()) {
      setError("Adresse destinataire requise");
      return;
    }

    if (!validateAddress(recipientAddress)) {
      setError("Adresse Ethereum invalide");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Montant invalide");
      return;
    }

    if (!wallets.length) {
      setError("Aucun wallet connecté");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🚀 Envoi de la transaction...");
      console.log({
        to: recipientAddress,
        amount: amount,
        network: selectedNetwork.name,
      });

      // Convertir le montant en Wei
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

      // Envoyer la transaction via Privy
      const result = await sendTransaction({
        to: recipientAddress,
        value: amountInWei.toString(),
        chainId: selectedNetwork.id,
      });

      const hash = typeof result === "string" ? result : result.hash;
      setTxHash(hash);

      console.log("✅ Transaction envoyée:", hash);

      // Rediriger vers la page de succès après 3 secondes
      setTimeout(() => {
        navigate("/success");
      }, 3000);
    } catch (err: any) {
      console.error("❌ Erreur transaction:", err);

      let errorMessage = "Erreur lors de l'envoi de la transaction";

      if (err.message?.includes("User rejected")) {
        errorMessage = "Transaction annulée par l'utilisateur";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Fonds insuffisants";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getExplorerUrl = () => {
    return selectedNetwork.isTestnet
      ? "https://sepolia.etherscan.io"
      : "https://etherscan.io";
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="send-crypto-container">
      <div className="send-crypto-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back
        </button>
        <h1>📤 Send Crypto</h1>
        <p>Send cryptocurrencies easily and securely</p>
      </div>

      <div className="send-crypto-content">
        <div className="send-form-container">
          <form onSubmit={handleSend} className="send-form">
            {/* Sélecteur de réseau */}
            <div className="form-group">
              <label htmlFor="network">🌐 Network</label>
              <div className="network-selector">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    type="button"
                    className={`network-option ${
                      selectedNetwork.id === network.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedNetwork(network)}
                    style={
                      {
                        "--network-color": network.color,
                      } as React.CSSProperties
                    }
                  >
                    <div className="network-info">
                      <span className="network-name">{network.shortName}</span>
                      <span className="network-type">
                        {network.isTestnet ? "Testnet" : "Mainnet"}
                      </span>
                    </div>
                    {network.isTestnet && (
                      <span className="testnet-badge">TEST</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Adresse destinataire */}
            <div className="form-group">
              <label htmlFor="recipient">📍 Recipient Address</label>
              <input
                type="text"
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x742F5...a8c1A"
                className="form-input"
                disabled={isLoading}
              />
              <small className="form-hint">
                Valid Ethereum address (42 characters starting with 0x)
              </small>
            </div>

            {/* Montant */}
            <div className="form-group">
              <label htmlFor="amount">💰 Amount</label>
              <div className="amount-input-container">
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.000001"
                  min="0"
                  className="form-input"
                  disabled={isLoading}
                />
                <span className="currency-label">
                  {selectedNetwork.currency}
                </span>
              </div>
              <small className="form-hint">
                Amount to send in {selectedNetwork.currency}
              </small>
            </div>

            {/* Wallet expéditeur */}
            {wallets.length > 0 && (
              <div className="form-group">
                <label>👤 Sender Wallet</label>
                <div className="sender-wallet">
                  <code>{wallets[0].address}</code>
                  <span className="wallet-type">
                    ({wallets[0].walletClientType})
                  </span>
                </div>
              </div>
            )}

            {/* Bouton d'envoi */}
            <button
              type="submit"
              className="send-button"
              disabled={isLoading || !recipientAddress || !amount}
            >
              {isLoading ? (
                <>
                  <span className="loading-icon">🔄</span>
                  Sending...
                </>
              ) : (
                <>
                  <span>📤</span>
                  Send {amount || "0"} {selectedNetwork.currency}
                </>
              )}
            </button>

            {/* Messages d'erreur */}
            {error && (
              <div className="error-message">
                <span>❌</span>
                {error}
              </div>
            )}

            {/* Succès avec hash de transaction */}
            {txHash && (
              <div className="success-message">
                <span>✅</span>
                <div>
                  <p>Transaction sent successfully!</p>
                  <p>
                    <strong>Hash:</strong> <code>{txHash}</code>
                  </p>
                  <a
                    href={`${getExplorerUrl()}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    🔗 View on Etherscan
                  </a>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Panneau d'information */}
        <div className="info-panel">
          <h3>💡 Information</h3>

          <div className="info-section">
            <h4>🔒 Security</h4>
            <ul>
              <li>Transactions secured by Privy</li>
              <li>Always verify recipient address</li>
              <li>Transactions are irreversible</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>💰 Fees</h4>
            <ul>
              <li>Gas fees automatically calculated</li>
              <li>Sepolia Network: Free (testnet)</li>
              <li>Ethereum Network: Variable fees</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>⏱️ Confirmation Time</h4>
            <ul>
              <li>Sepolia: ~15 seconds</li>
              <li>Ethereum: 1-5 minutes</li>
              <li>Real-time tracking available</li>
            </ul>
          </div>

          {selectedNetwork.isTestnet && (
            <div className="warning-section">
              <h4>🚨 Warning - Testnet</h4>
              <p>
                You are using the Sepolia test network. Cryptocurrencies sent
                have no real value.
              </p>
            </div>
          )}

          {!selectedNetwork.isTestnet && (
            <div className="warning-section mainnet">
              <h4>⚠️ Warning - Mainnet</h4>
              <p>
                You are using the main Ethereum network. Cryptocurrencies sent
                have real value and cannot be recovered.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendCrypto;
