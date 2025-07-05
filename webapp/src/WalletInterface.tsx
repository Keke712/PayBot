import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";

function WalletInterface() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [discordId, setDiscordId] = useState("");
  const [linkingStatus, setLinkingStatus] = useState<string | null>(null);

  const handleLinkDiscord = () => {
    if (!discordId.trim()) {
      setLinkingStatus("❌ Veuillez entrer votre Discord ID");
      return;
    }

    setLinkingStatus("✅ Compte Discord lié avec succès!");
    console.log(`Linking Discord ID ${discordId} to user ${user?.id}`);
  };

  if (!authenticated) {
    return (
      <div className="card">
        <h2>🤖 PayBot Wallet Interface</h2>
        <p>
          Connectez-vous pour gérer votre wallet et lier votre compte Discord
        </p>
        <button onClick={login}>🔐 Se connecter avec Privy</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        👋 Bienvenue,{" "}
        {user?.email?.address || user?.phone?.number || "Utilisateur"}
      </h2>

      {/* Discord Linking Section */}
      <div className="wallet-card" style={{ marginBottom: "2rem" }}>
        <h3>🔗 Lier votre compte Discord</h3>
        <p>Pour utiliser le bot Discord, liez votre compte:</p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginTop: "10px",
          }}
        >
          <input
            type="text"
            placeholder="Votre Discord ID (ex: 123456789012345678)"
            value={discordId}
            onChange={(e) => setDiscordId(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #646cff",
              background: "rgba(0,0,0,0.3)",
              color: "white",
            }}
          />
          <button onClick={handleLinkDiscord}>Lier le compte</button>
        </div>
        {linkingStatus && (
          <p style={{ marginTop: "10px", fontSize: "14px" }}>{linkingStatus}</p>
        )}
        <div
          style={{
            marginTop: "15px",
            fontSize: "12px",
            color: "#888",
          }}
        >
          <p>📋 Pour trouver votre Discord ID:</p>
          <ol style={{ textAlign: "left", paddingLeft: "20px" }}>
            <li>Activez le mode développeur dans Discord</li>
            <li>Clic droit sur votre nom d'utilisateur</li>
            <li>Sélectionnez "Copier l'identifiant"</li>
          </ol>
        </div>
      </div>

      {/* Wallets Section */}
      <div>
        <h3>💼 Vos Wallets:</h3>
        {wallets.length > 0 ? (
          wallets.map((wallet, index) => (
            <div key={index} className="wallet-card">
              <p>
                <strong>🔗 Type:</strong> {wallet.walletClientType}
              </p>
              <p>
                <strong>📍 Adresse:</strong>
              </p>
              <div className="wallet-address">{wallet.address}</div>
              <p>
                <strong>⛓️ Réseau:</strong>{" "}
                {wallet.chainId === "eip155:11155111"
                  ? "Sepolia Testnet"
                  : wallet.chainId === "eip155:1"
                  ? "Ethereum Mainnet"
                  : wallet.chainId
                  ? `Chain ${wallet.chainId}`
                  : "Ethereum"}
              </p>
              {(wallet.chainId === "eip155:11155111" ||
                (wallet.chainId && wallet.chainId.includes("11155111"))) && (
                <div className="testnet-badge">
                  🚨 TESTNET - Pas de valeur réelle
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="wallet-card">
            <p>❌ Aucun wallet trouvé</p>
            <p>
              Une fois votre compte lié, utilisez la commande{" "}
              <code>$wallet</code> dans Discord
            </p>
          </div>
        )}
      </div>

      <div className="sepolia-info wallet-card">
        <h3>🚰 ETH de Test Sepolia</h3>
        <p>Pour tester les paiements, obtenez des ETH gratuits :</p>
        <button
          onClick={() => window.open("https://sepoliafaucet.com/", "_blank")}
          style={{ margin: "5px" }}
        >
          🔗 Sepolia Faucet
        </button>
        <button
          onClick={() =>
            window.open(
              "https://faucet.quicknode.com/ethereum/sepolia",
              "_blank"
            )
          }
          style={{ margin: "5px" }}
        >
          🔗 QuickNode Faucet
        </button>
        <p style={{ fontSize: "0.9em", color: "#888", marginTop: "10px" }}>
          Ou utilisez la commande <code>$faucet</code> dans Discord
        </p>
      </div>

      <button onClick={logout} style={{ marginTop: "1rem" }}>
        🚪 Se déconnecter
      </button>

      <p className="read-the-docs">
        Utilisez le bot Discord avec $pay @utilisateur montant pour envoyer des
        paiements sur Sepolia
      </p>
    </div>
  );
}

export default WalletInterface;
