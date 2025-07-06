import { usePrivy, useWallets, useFundWallet } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function WalletInterface() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();
  const navigate = useNavigate();
  const [fundingInProgress, setFundingInProgress] = useState(false);

  // Fonction pour gérer le refill
  const handleRefill = async () => {
    if (!wallets.length) {
      alert("No wallet available for funding");
      return;
    }

    setFundingInProgress(true);
    try {
      const wallet = wallets[0];
      console.log("🏦 Opening Privy funding interface...");

      if (!wallet.address || typeof wallet.address !== "string") {
        throw new Error("Invalid wallet address");
      }

      const walletAddress = wallet.address.toString();
      await fundWallet(walletAddress);
      console.log("✅ Funding initiated successfully");
    } catch (error) {
      console.error("❌ Error during funding:", error);
      if (error instanceof Error && error.message.includes("User rejected")) {
        console.log("Funding cancelled by user");
      } else {
        alert(
          `Funding error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } finally {
      setFundingInProgress(false);
    }
  };

  const handleSend = () => {
    navigate("/send");
  };

  const handleReceive = () => {
    navigate("/receive");
  };

  if (!authenticated) {
    return (
      <div className="card card-primary">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "2rem",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🤖
          </div>
          <h2 style={{ color: "var(--text-primary)", marginBottom: "1.5rem" }}>
            PayBot Wallet Interface
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto 3rem auto",
              lineHeight: "1.6",
            }}
          >
            Professional crypto payment platform via Discord. Connect to access
            your secure dashboard.
          </p>
        </div>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <button
            onClick={login}
            className="btn-primary"
            style={{
              fontSize: "1.1rem",
              padding: "1.25rem 3rem",
              borderRadius: "16px",
              fontWeight: "600",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            🔐 Connect with Privy
          </button>
        </div>

        <div className="grid grid-3">
          <div
            style={{
              background: "var(--bg-primary)",
              padding: "2rem",
              borderRadius: "16px",
              border: "1px solid var(--border-light)",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                marginBottom: "1rem",
                color: "var(--primary)",
              }}
            >
              💸
            </div>
            <h4
              style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}
            >
              Instant Payments
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Send cryptocurrencies directly via Discord
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-primary)",
              padding: "2rem",
              borderRadius: "16px",
              border: "1px solid var(--border-light)",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                marginBottom: "1rem",
                color: "var(--secondary)",
              }}
            >
              🌐
            </div>
            <h4
              style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}
            >
              Multi-Networks
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Support for Ethereum Mainnet and Sepolia Testnet
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-primary)",
              padding: "2rem",
              borderRadius: "16px",
              border: "1px solid var(--border-light)",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                marginBottom: "1rem",
                color: "var(--accent)",
              }}
            >
              🔒
            </div>
            <h4
              style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}
            >
              Privy Security
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Enterprise-level security infrastructure
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Panel de boutons principaux */}
      <div className="action-panel">
        <h2
          style={{
            textAlign: "center",
            marginBottom: "2rem",
            color: "var(--text-primary)",
          }}
        >
          💼 Wallet Actions
        </h2>

        <div className="action-buttons">
          <button
            className="action-btn send-btn"
            onClick={handleSend}
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "white",
              border: "none",
              padding: "2rem",
              borderRadius: "20px",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 25px rgba(37, 99, 235, 0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              flex: "1",
              minHeight: "120px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 12px 35px rgba(37, 99, 235, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 25px rgba(37, 99, 235, 0.3)";
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>📤</span>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>SEND</div>
              <div style={{ fontSize: "0.9rem", opacity: "0.8" }}>
                Send crypto
              </div>
            </div>
          </button>

          <button
            className="action-btn receive-btn"
            onClick={handleReceive}
            style={{
              background: "linear-gradient(135deg, #059669, #047857)",
              color: "white",
              border: "none",
              padding: "2rem",
              borderRadius: "20px",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 25px rgba(5, 150, 105, 0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              flex: "1",
              minHeight: "120px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 12px 35px rgba(5, 150, 105, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 25px rgba(5, 150, 105, 0.3)";
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>📥</span>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>
                RECEIVE
              </div>
              <div style={{ fontSize: "0.9rem", opacity: "0.8" }}>
                Copy address
              </div>
            </div>
          </button>

          <button
            className="action-btn refill-btn"
            onClick={handleRefill}
            disabled={fundingInProgress || wallets.length === 0}
            style={{
              background: fundingInProgress
                ? "linear-gradient(135deg, #6b7280, #4b5563)"
                : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "white",
              border: "none",
              padding: "2rem",
              borderRadius: "20px",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor:
                fundingInProgress || wallets.length === 0
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.3s ease",
              boxShadow: fundingInProgress
                ? "0 8px 25px rgba(107, 114, 128, 0.3)"
                : "0 8px 25px rgba(124, 58, 237, 0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              flex: "1",
              minHeight: "120px",
              opacity: fundingInProgress || wallets.length === 0 ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!fundingInProgress && wallets.length > 0) {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 35px rgba(124, 58, 237, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!fundingInProgress && wallets.length > 0) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 8px 25px rgba(124, 58, 237, 0.3)";
              }
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>
              {fundingInProgress ? "🔄" : "💳"}
            </span>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>
                {fundingInProgress ? "LOADING..." : "REFILL"}
              </div>
              <div style={{ fontSize: "0.9rem", opacity: "0.8" }}>
                {fundingInProgress ? "Opening..." : "Add funds"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Section Wallets */}
      <div style={{ marginTop: "4rem" }}>
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
            color: "var(--text-primary)",
          }}
        >
          💼 Connected Wallets
        </h3>

        {wallets.length > 0 ? (
          <div className="grid grid-2">
            {wallets.map((wallet, index) => (
              <div key={index} className="wallet-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>🔗</span>
                      <span
                        style={{
                          fontWeight: "500",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Type:
                      </span>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        {wallet.walletClientType}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>⛓️</span>
                      <span
                        style={{
                          fontWeight: "500",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Network:
                      </span>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        {wallet.chainId === "eip155:11155111"
                          ? "Sepolia Testnet"
                          : wallet.chainId === "eip155:1"
                          ? "Ethereum Mainnet"
                          : wallet.chainId
                          ? `Chain ${wallet.chainId}`
                          : "Ethereum"}
                      </span>
                    </div>
                  </div>
                  {(wallet.chainId === "eip155:11155111" ||
                    (wallet.chainId &&
                      wallet.chainId.includes("11155111"))) && (
                    <div className="testnet-badge">TEST</div>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      marginBottom: "0.75rem",
                      fontWeight: "500",
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                    }}
                  >
                    📍 WALLET ADDRESS
                  </div>
                  <div className="wallet-address">
                    <code>{wallet.address}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="card card-warning"
            style={{ textAlign: "center", padding: "3rem" }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>💳</div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>
              No connected wallet
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              Use the <code>$wallet</code> command in Discord to configure your
              wallets
            </p>
          </div>
        )}
      </div>

      {/* Command Reference - Simplifié */}
      <div
        className="card card-primary"
        style={{ marginTop: "3rem", padding: "2rem" }}
      >
        <h4
          style={{
            color: "var(--primary)",
            marginBottom: "1.5rem",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          🎮 Essential Discord Commands
        </h4>
        <div
          style={{
            display: "flex",
            gap: "2rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <code
              style={{
                fontSize: "0.9rem",
                padding: "0.5rem 0.75rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "8px",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              $pay @user amount
            </code>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Envoyer un paiement
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <code
              style={{
                fontSize: "0.9rem",
                padding: "0.5rem 0.75rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "8px",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              $wallet
            </code>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              View your wallets
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <code
              style={{
                fontSize: "0.9rem",
                padding: "0.5rem 0.75rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "8px",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              $balance
            </code>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Check balance
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.5rem",
          marginTop: "3rem",
          paddingTop: "2rem",
          borderTop: "1px solid var(--border-light)",
        }}
      >
        <button
          onClick={logout}
          className="btn-ghost"
          style={{
            padding: "1rem 2rem",
            fontSize: "1rem",
            fontWeight: "500",
          }}
        >
          🚪 Disconnect
        </button>
      </div>
    </div>
  );
}

export default WalletInterface;
