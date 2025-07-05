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

      const txResult = await sendTransaction({
        to: payment.recipient_wallet,
        value: amountInWei.toString(),
        // Privy gère automatiquement le réseau et la signature
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

  if (loading) {
    return (
      <div className="card">
        <h2>🔄 Chargement du paiement...</h2>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="card">
        <h2>❌ Erreur</h2>
        <p>{error || "Paiement non trouvé"}</p>
        <button onClick={() => navigate("/")}>Retour à l'accueil</button>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="card">
        <h2>🔐 Authentification requise</h2>
        <p>Connectez-vous pour confirmer ce paiement</p>
        <div className="payment-summary">
          <h3>📋 Détails du paiement:</h3>
          <p>
            <strong>Expéditeur:</strong> {payment.sender_name}
          </p>
          <p>
            <strong>Destinataire:</strong> {payment.recipient_name}
          </p>
          <p>
            <strong>Montant:</strong> {payment.amount} {payment.currency}
          </p>
        </div>
        <button onClick={login}>🔐 Se connecter avec Privy</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>💸 Confirmation de Paiement</h2>

      {payment.status === "completed" ? (
        <div className="success-message">
          <h3>✅ Paiement confirmé avec succès!</h3>
          <p>La transaction a été exécutée sur la blockchain via Privy.</p>
          {transactionHash && (
            <div className="transaction-details">
              <p>
                <strong>Hash de transaction:</strong>
              </p>
              <code>{transactionHash}</code>
              <br />
              <a
                href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: "10px", display: "inline-block" }}
              >
                🔗 Voir sur Etherscan
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
                href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Suivre sur Etherscan
              </a>
            </div>
          )}

          <div className="payment-details">
            <h3>📋 Détails de la transaction:</h3>

            <div className="payment-info">
              <div className="info-row">
                <span>👤 Expéditeur:</span>
                <span>{payment.sender_name}</span>
              </div>
              <div className="info-row">
                <span>👤 Destinataire:</span>
                <span>{payment.recipient_name}</span>
              </div>
              <div className="info-row">
                <span>💰 Montant:</span>
                <span className="amount">
                  {payment.amount} {payment.currency}
                  {payment.sender_chain.includes("Sepolia") && " (TEST)"}
                </span>
              </div>
              <div className="info-row">
                <span>⛓️ Réseau:</span>
                <span>{payment.sender_chain}</span>
              </div>
              <div className="info-row">
                <span>📅 Date:</span>
                <span>{new Date(payment.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="wallet-details">
              <h4>💼 Adresses des wallets:</h4>
              <div className="wallet-address">
                <strong>Expéditeur:</strong>
                <code>{payment.sender_wallet}</code>
              </div>
              <div className="wallet-address">
                <strong>Destinataire:</strong>
                <code>{payment.recipient_wallet}</code>
              </div>
            </div>

            {wallets.length > 0 && (
              <div className="user-wallets">
                <h4>🔗 Vos wallets Privy connectés:</h4>
                {wallets.map((wallet, index) => (
                  <div key={index} className="wallet-item">
                    <code>{wallet.address}</code>
                    <span>({wallet.walletClientType})</span>
                    {wallet.address.toLowerCase() ===
                      payment.sender_wallet.toLowerCase() && (
                      <span style={{ color: "#22c55e", fontWeight: "bold" }}>
                        {" "}
                        ✅ Expéditeur
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
              {executing ? "🔄 Envoi via Privy..." : "💸 Envoyer le paiement"}
            </button>

            <button onClick={() => navigate("/")} className="cancel-button">
              ❌ Annuler
            </button>
          </div>

          <div className="warning">
            <p>
              ⚠️ <strong>Important:</strong> Cette action enverra réellement{" "}
              {payment.amount} {payment.currency} de votre wallet Privy vers le
              destinataire. Assurez-vous d'avoir suffisamment de fonds.
            </p>
            <p>
              🔐 <strong>Privy:</strong> La transaction sera exécutée
              directement via l'intégration Privy. Aucune configuration externe
              n'est requise.
            </p>
            {payment.sender_chain.includes("Sepolia") && (
              <p>
                🚨 <strong>Testnet:</strong> Cette transaction utilisera le
                réseau Sepolia Testnet avec des ETH de test.
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
          <h4>❌ Erreur</h4>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default PaymentConfirmation;
