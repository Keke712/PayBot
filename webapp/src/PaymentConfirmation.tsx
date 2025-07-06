import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";

interface PaymentData {
  id: string;
  sender_id: number;
  sender_name: string;
  recipient_id: number;
  recipient_name: string;
  amount: number;
  currency: string;
  network?: string; // Add network field
  chain_id?: number; // Add chain_id field
  sender_wallet: string;
  recipient_wallet: string;
  sender_chain: string;
  recipient_chain: string;
  timestamp: string;
  status: string;
  guild_id: number;
  channel_id: number;
  transaction_hash?: string; // Add this property
}

function PaymentConfirmation() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentData();
  }, [paymentId]);

  const loadPaymentData = async () => {
    try {
      if (!paymentId) {
        throw new Error("ID de paiement manquant");
      }

      console.log("🔍 Chargement du paiement:", paymentId);

      // Récupérer les données réelles depuis le serveur
      const response = await fetch(`/api/payment/${paymentId}`);

      console.log("📡 Réponse API:", response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Paiement non trouvé ou expiré");
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log("✅ Données reçues:", paymentData);
      setPayment(paymentData);
    } catch (err) {
      console.error("❌ Erreur chargement paiement:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const executeTransaction = async () => {
    if (!payment || !authenticated || !wallets.length) return;

    setExecuting(true);
    setError(null);

    try {
      console.log(
        "🔄 Exécution de la transaction via Privy intégration directe..."
      );

      // Déterminer le chain ID correct basé sur le réseau du paiement
      let targetChainId: number;
      let networkName: string;

      if (payment.network === "sepolia" || payment.chain_id === 11155111) {
        targetChainId = 11155111; // Sepolia
        networkName = "Sepolia Testnet";
      } else if (payment.network === "ethereum" || payment.chain_id === 1) {
        targetChainId = 1; // Ethereum Mainnet
        networkName = "Ethereum Mainnet";
      } else {
        // Fallback sur le chain_id du paiement
        targetChainId = payment.chain_id || 11155111;
        networkName = payment.sender_chain || "Réseau inconnu";
      }

      console.log("🌐 Réseau cible:", {
        paymentNetwork: payment.network,
        paymentChainId: payment.chain_id,
        targetChainId: targetChainId,
        networkName: networkName,
      });

      // Trouver le wallet de l'expéditeur
      const senderWallet = wallets.find(
        (w) => w.address.toLowerCase() === payment.sender_wallet.toLowerCase()
      );

      if (!senderWallet) {
        console.log(
          "❌ Wallets disponibles:",
          wallets.map((w) => ({ address: w.address, type: w.walletClientType }))
        );
        throw new Error(
          `Wallet expéditeur ${payment.sender_wallet} non trouvé dans vos wallets Privy connectés.`
        );
      }

      console.log("✅ Wallet expéditeur trouvé:", {
        address: senderWallet.address,
        type: senderWallet.walletClientType,
      });

      // Calculer la valeur en Wei
      const amountInWei = BigInt(
        Math.floor(parseFloat(String(payment.amount)) * 1e18)
      );

      console.log("💰 Détails de la transaction:");
      console.log("  Montant:", payment.amount, "ETH");
      console.log("  Montant en Wei:", amountInWei.toString());
      console.log("  De:", payment.sender_wallet);
      console.log("  Vers:", payment.recipient_wallet);

      // Utiliser Privy's sendTransaction hook directement
      console.log("📤 Envoi de la transaction via Privy sendTransaction...");

      // Privy handles network switching automatically based on the transaction
      const txResult = await sendTransaction({
        to: payment.recipient_wallet,
        value: amountInWei.toString(),
        // Let Privy handle the chain automatically, or include if supported
        ...(targetChainId && { chainId: targetChainId }),
      });

      // Extraire le hash de la transaction
      const txHash = typeof txResult === "string" ? txResult : txResult.hash;

      console.log("✅ Transaction envoyée avec succès:", txHash);
      setTransactionHash(txHash);

      // Mettre à jour le statut du paiement côté serveur
      console.log("📡 Mise à jour du statut...");
      const updateResponse = await fetch(`/api/payment/${payment.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          transaction_hash: txHash,
          confirmed_at: new Date().toISOString(),
          wallet_type: senderWallet.walletClientType,
          executed_via: "privy_direct",
        }),
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log("✅ Statut mis à jour côté serveur:", result);

        setPayment({
          ...payment,
          status: "completed",
          transaction_hash: txHash,
        });

        // Rediriger vers la page de succès
        setTimeout(() => {
          navigate("/success");
        }, 2000);
      } else {
        console.warn("⚠️ Erreur mise à jour serveur, mais transaction envoyée");
        // Même si la mise à jour serveur échoue, la transaction a été envoyée
        setPayment({
          ...payment,
          status: "completed",
          transaction_hash: txHash,
        });

        setTimeout(() => {
          navigate("/success");
        }, 2000);
      }
    } catch (err: unknown) {
      console.error("❌ Erreur lors de la transaction:", err);

      // Gestion des erreurs Privy
      let errorMessage = "Erreur lors de l'envoi de la transaction";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err && typeof err === "object") {
        errorMessage = (err as any).message || errorMessage;
      }

      // Messages d'erreur spécifiques
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("rejected")
      ) {
        errorMessage = "Transaction annulée par l'utilisateur";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Fonds insuffisants pour effectuer la transaction";
      } else if (errorMessage.includes("network")) {
        errorMessage = "Problème de réseau - vérifiez votre connexion";
      } else if (errorMessage.includes("gas")) {
        errorMessage = "Erreur de gaz - la transaction a échoué";
      }

      setError(errorMessage);
    } finally {
      setExecuting(false);
    }
  };

  // Helper function to determine if it's a testnet
  const isTestnet = () => {
    if (!payment) return false;

    // Check multiple indicators for Sepolia testnet
    return (
      payment.network === "sepolia" ||
      payment.chain_id === 11155111 ||
      payment.sender_chain?.toLowerCase().includes("sepolia") ||
      payment.sender_chain?.toLowerCase().includes("testnet")
    );
  };

  // Helper function to determine if it's mainnet
  const isMainnet = () => {
    if (!payment) return false;

    // Only consider it mainnet if explicitly ethereum network with chain ID 1
    return (
      (payment.network === "ethereum" && payment.chain_id === 1) ||
      payment.chain_id === 1 ||
      (payment.sender_chain?.toLowerCase().includes("mainnet") &&
        !payment.sender_chain?.toLowerCase().includes("sepolia"))
    );
  };

  // Helper function to get correct explorer URL
  const getExplorerUrl = () => {
    if (isTestnet()) {
      return "https://sepolia.etherscan.io";
    } else if (isMainnet()) {
      return "https://etherscan.io";
    } else {
      // Default to Sepolia for unknown networks
      return "https://sepolia.etherscan.io";
    }
  };

  // Helper function to get network display name
  const getNetworkDisplayName = () => {
    if (isTestnet()) {
      return "Sepolia Testnet";
    } else if (isMainnet()) {
      return "Ethereum Mainnet";
    } else {
      // Fallback to payment data or default
      return payment?.sender_chain || payment?.network || "Réseau inconnu";
    }
  };

  // Add debug logging to understand what's happening
  useEffect(() => {
    if (payment) {
      console.log("🔍 Debug network detection:", {
        network: payment.network,
        chain_id: payment.chain_id,
        sender_chain: payment.sender_chain,
        isTestnet: isTestnet(),
        isMainnet: isMainnet(),
        displayName: getNetworkDisplayName(),
      });
    }
  }, [payment]);

  if (loading) {
    return (
      <div className="card">
        <h2>🔄 Loading payment...</h2>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="card">
        <h2>❌ Error</h2>
        <p>{error || "Payment not found"}</p>
        <button onClick={() => navigate("/")}>Back to home</button>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="card">
        <h2>🔐 Authentication required</h2>
        <p>Connect to confirm this payment</p>
        <div className="payment-summary">
          <h3>📋 Payment details:</h3>
          <p>
            <strong>Sender:</strong> {payment.sender_name}
          </p>
          <p>
            <strong>Recipient:</strong> {payment.recipient_name}
          </p>
          <p>
            <strong>Amount:</strong> {payment.amount} {payment.currency}
          </p>
        </div>
        <button onClick={login}>🔐 Connect with Privy</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>💸 Payment Confirmation</h2>

      {payment.status === "completed" ? (
        <div className="success-message">
          <h3>✅ Payment confirmed successfully!</h3>
          <p>
            The transaction was executed on {getNetworkDisplayName()} via Privy.
          </p>
          {transactionHash && (
            <div className="transaction-details">
              <p>
                <strong>Transaction hash:</strong>
              </p>
              <code>{transactionHash}</code>
              <br />
              <a
                href={`${getExplorerUrl()}/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: "10px", display: "inline-block" }}
              >
                🔗 View on Etherscan
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Affichage du hash de transaction en cours */}
          {transactionHash && (
            <div className="transaction-pending">
              <h4>🔄 Transaction en cours...</h4>
              <p>
                <strong>Hash:</strong> <code>{transactionHash}</code>
              </p>
              <a
                href={`${getExplorerUrl()}/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Suivre sur Etherscan
              </a>
            </div>
          )}

          {/* Affichage d'un avertissement réseau basé sur les données réelles */}
          {isTestnet() && !isMainnet() && (
            <div className="testnet-warning">
              <h3>🚨 SEPOLIA TEST NETWORK</h3>
              <p>This transaction uses test ETH with no real value.</p>
              <p>
                <strong>Network:</strong> {getNetworkDisplayName()}
              </p>
              <p>
                <strong>Chain ID:</strong> {payment.chain_id || 11155111}
              </p>
              <p>
                <strong>Debug:</strong> network={payment.network}, chain_id=
                {payment.chain_id}
              </p>
            </div>
          )}

          {isMainnet() && !isTestnet() && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "2px solid rgba(239, 68, 68, 0.5)",
                padding: "15px",
                borderRadius: "8px",
                margin: "20px 0",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#ef4444", margin: "0 0 10px 0" }}>
                ⚠️ ETHEREUM MAINNET
              </h3>
              <p>This transaction will use real ETH with real value!</p>
              <p>
                <strong>Network:</strong> {getNetworkDisplayName()}
              </p>
              <p>
                <strong>Chain ID:</strong> {payment.chain_id || 1}
              </p>
            </div>
          )}

          {/* Debug information - remove in production */}
          {process.env.NODE_ENV === "development" && (
            <div
              style={{
                background: "rgba(255, 255, 0, 0.1)",
                border: "1px solid rgba(255, 255, 0, 0.3)",
                padding: "10px",
                borderRadius: "4px",
                margin: "10px 0",
                fontSize: "0.8em",
              }}
            >
              <strong>Debug Info:</strong>
              <br />
              Network: {payment?.network || "undefined"}
              <br />
              Chain ID: {payment?.chain_id || "undefined"}
              <br />
              Sender Chain: {payment?.sender_chain || "undefined"}
              <br />
              Is Testnet: {isTestnet().toString()}
              <br />
              Is Mainnet: {isMainnet().toString()}
            </div>
          )}

          <div className="payment-details">
            <h3>📋 Transaction details:</h3>

            <div className="payment-info">
              <div className="info-row">
                <span>👤 Sender:</span>
                <span>{payment.sender_name}</span>
              </div>
              <div className="info-row">
                <span>👤 Recipient:</span>
                <span>{payment.recipient_name}</span>
              </div>
              <div className="info-row">
                <span>💰 Amount:</span>
                <span className="amount">
                  {payment.amount} {payment.currency}
                  {isTestnet() && !isMainnet() && " (TEST)"}
                  {isMainnet() && !isTestnet() && " (REAL)"}
                </span>
              </div>
              <div className="info-row">
                <span>🌐 Network:</span>
                <span>
                  {getNetworkDisplayName()}
                  {payment.chain_id && ` (Chain ID: ${payment.chain_id})`}
                </span>
              </div>
              <div className="info-row">
                <span>📅 Date:</span>
                <span>{new Date(payment.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="wallet-details">
              <h4>💼 Wallet addresses:</h4>
              <div className="wallet-address">
                <strong>Sender:</strong>
                <code>{payment.sender_wallet}</code>
              </div>
              <div className="wallet-address">
                <strong>Recipient:</strong>
                <code>{payment.recipient_wallet}</code>
              </div>
            </div>

            {wallets.length > 0 && (
              <div className="user-wallets">
                <h4>🔗 Your connected Privy wallets:</h4>
                {wallets.map((wallet, index) => (
                  <div key={index} className="wallet-item">
                    <code>{wallet.address}</code>
                    <span>({wallet.walletClientType})</span>
                    {wallet.address.toLowerCase() ===
                      payment.sender_wallet.toLowerCase() && (
                      <span style={{ color: "#22c55e", fontWeight: "bold" }}>
                        {" "}
                        ✅ Sender
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="confirmation-actions">
            <button
              onClick={executeTransaction}
              disabled={executing}
              className="confirm-button"
            >
              {executing
                ? "🔄 Sending via Privy..."
                : `💸 Send ${payment.amount} ${
                    payment.currency
                  } on ${getNetworkDisplayName()}`}
            </button>

            <button onClick={() => navigate("/")} className="cancel-button">
              ❌ Cancel
            </button>
          </div>

          <div className="warning">
            <p>
              ⚠️ <strong>Important:</strong> This action will actually send{" "}
              {payment.amount} {payment.currency} from your Privy wallet to the
              recipient on the <strong>{getNetworkDisplayName()}</strong>{" "}
              network.
            </p>
            <p>
              🔐 <strong>Privy:</strong> The transaction will be executed
              directly via Privy integration. Your wallet will automatically
              switch networks if necessary.
            </p>
            {isTestnet() && !isMainnet() && (
              <p>
                🚨 <strong>Testnet:</strong> This transaction will use the
                Sepolia Testnet network (Chain ID:{" "}
                {payment.chain_id || 11155111}) with test ETH of no value.
              </p>
            )}
            {isMainnet() && !isTestnet() && (
              <p style={{ color: "#ef4444", fontWeight: "bold" }}>
                💰 <strong>Mainnet:</strong> This transaction will use real ETH
                on the main Ethereum network (Chain ID: {payment.chain_id || 1}
                ). Make sure you have sufficient funds!
              </p>
            )}
          </div>
        </>
      )}

      {error && (
        <div
          className="error-message"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "15px",
            borderRadius: "8px",
            margin: "20px 0",
            color: "#ef4444",
          }}
        >
          <h4>❌ Error</h4>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default PaymentConfirmation;
