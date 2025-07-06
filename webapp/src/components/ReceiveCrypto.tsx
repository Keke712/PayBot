import React, { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import "./ReceiveCrypto.css";

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

const ReceiveCrypto: React.FC = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(networks[0]);

  useEffect(() => {
    if (!authenticated) {
      navigate("/");
    }
  }, [authenticated, navigate]);

  useEffect(() => {
    if (wallets.length > 0) {
      setSelectedWallet(wallets[0]);
    }
  }, [wallets]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess("Address copied to clipboard!");
      setTimeout(() => setCopySuccess(""), 3000);
    } catch (err) {
      setCopySuccess("Failed to copy address");
      setTimeout(() => setCopySuccess(""), 3000);
    }
  };

  const generateQRCodeUrl = (address: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`;
  };

  const getNetworkFromWallet = (wallet: any) => {
    if (wallet.chainId === "eip155:11155111") {
      return networks[0]; // Sepolia
    } else if (wallet.chainId === "eip155:1") {
      return networks[1]; // Ethereum
    }
    return networks[0]; // Default to Sepolia
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="receive-crypto-container">
      <div className="receive-crypto-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back
        </button>
        <h1>📥 Receive Crypto</h1>
        <p>Share your wallet address to receive cryptocurrency payments</p>
      </div>

      <div className="receive-crypto-content">
        {wallets.length === 0 ? (
          <div className="no-wallets-message">
            <div className="no-wallets-icon">💳</div>
            <h3>No Wallets Found</h3>
            <p>
              You need to have a wallet connected to receive cryptocurrency.
            </p>
            <p>
              Use the Discord command <code>$wallet</code> to set up your wallet
              first.
            </p>
          </div>
        ) : (
          <>
            {/* Wallet Selector */}
            {wallets.length > 1 && (
              <div className="wallet-selector-section">
                <h3>📱 Select Wallet</h3>
                <div className="wallet-selector">
                  {wallets.map((wallet, index) => (
                    <button
                      key={index}
                      className={`wallet-option ${
                        selectedWallet?.address === wallet.address
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => setSelectedWallet(wallet)}
                    >
                      <div className="wallet-info">
                        <span className="wallet-type">
                          {wallet.walletClientType}
                        </span>
                        <span className="wallet-address-short">
                          {wallet.address.slice(0, 6)}...
                          {wallet.address.slice(-4)}
                        </span>
                      </div>
                      <div className="wallet-network">
                        {wallet.chainId === "eip155:11155111"
                          ? "Sepolia"
                          : "Ethereum"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Receive Section */}
            {selectedWallet && (
              <div className="receive-main-section">
                <div className="receive-card">
                  <div className="receive-card-header">
                    <h2>💼 Your Wallet Address</h2>
                    <p className="receive-instruction">
                      Share this address with anyone who wants to send you
                      cryptocurrency. It's like your bank account number, but
                      for crypto!
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="qr-code-section">
                    <div className="qr-code-container">
                      <img
                        src={generateQRCodeUrl(selectedWallet.address)}
                        alt="Wallet Address QR Code"
                        className="qr-code"
                      />
                    </div>
                    <p className="qr-instruction">
                      Scan this QR code with any crypto wallet app
                    </p>
                  </div>

                  {/* Address Display */}
                  <div className="address-section">
                    <label className="address-label">
                      🏷️ Wallet Address (
                      {getNetworkFromWallet(selectedWallet).shortName})
                    </label>
                    <div className="address-container">
                      <div className="address-display">
                        <code className="address-code">
                          {selectedWallet.address}
                        </code>
                      </div>
                      <button
                        className="copy-button"
                        onClick={() => copyToClipboard(selectedWallet.address)}
                      >
                        📋 Copy
                      </button>
                    </div>

                    {copySuccess && (
                      <div className="copy-success">✅ {copySuccess}</div>
                    )}
                  </div>

                  {/* Wallet Details */}
                  <div className="wallet-details">
                    <div className="detail-row">
                      <span className="detail-label">🔗 Wallet Type:</span>
                      <span className="detail-value">
                        {selectedWallet.walletClientType}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">🌐 Network:</span>
                      <span className="detail-value">
                        {getNetworkFromWallet(selectedWallet).name}
                        {getNetworkFromWallet(selectedWallet).isTestnet && (
                          <span className="testnet-badge">TEST</span>
                        )}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">💰 Currency:</span>
                      <span className="detail-value">
                        {getNetworkFromWallet(selectedWallet).currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instructions Panel */}
                <div className="instructions-panel">
                  <h3>💡 How to Receive Crypto</h3>

                  <div className="instruction-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h4>Share Your Address</h4>
                      <p>
                        Copy the address above and share it with the person
                        sending you crypto, or let them scan the QR code.
                      </p>
                    </div>
                  </div>

                  <div className="instruction-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h4>Wait for Transaction</h4>
                      <p>
                        The sender will initiate the transaction from their
                        wallet. This usually takes a few minutes to confirm.
                      </p>
                    </div>
                  </div>

                  <div className="instruction-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h4>Check Your Balance</h4>
                      <p>
                        Use the Discord command <code>$balance</code> to check
                        if you received the crypto.
                      </p>
                    </div>
                  </div>

                  {/* Safety Tips */}
                  <div className="safety-section">
                    <h4>🔒 Safety Tips</h4>
                    <ul>
                      <li>✅ This address is safe to share publicly</li>
                      <li>⚠️ Never share your private keys or seed phrase</li>
                      <li>🔍 Always verify the network matches the sender's</li>
                      <li>📱 Double-check addresses before sharing</li>
                    </ul>
                  </div>

                  {/* Network Warning */}
                  {getNetworkFromWallet(selectedWallet).isTestnet ? (
                    <div className="network-warning testnet">
                      <h4>🧪 Testnet Notice</h4>
                      <p>
                        You're on{" "}
                        <strong>
                          {getNetworkFromWallet(selectedWallet).name}
                        </strong>
                        . This is a test network - any crypto received here has
                        no real value. Perfect for testing and learning!
                      </p>
                    </div>
                  ) : (
                    <div className="network-warning mainnet">
                      <h4>💰 Mainnet Notice</h4>
                      <p>
                        You're on{" "}
                        <strong>
                          {getNetworkFromWallet(selectedWallet).name}
                        </strong>
                        . This is the main Ethereum network - any crypto
                        received here has real value. Be extra careful with
                        transactions!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiveCrypto;
