import { usePrivy, useWallets } from "@privy-io/react-auth";

function WalletInterface() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  if (!authenticated) {
    return (
      <div className="card">
        <h2>🤖 PayBot Wallet Interface</h2>
        <p>Connectez-vous pour gérer votre wallet et utiliser le bot Discord</p>
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
              Une fois connecté, utilisez la commande <code>$wallet</code> dans
              Discord
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
