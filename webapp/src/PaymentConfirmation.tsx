import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

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
}

function PaymentConfirmation() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const confirmPayment = async () => {
    if (!payment || !authenticated) return;

    setConfirming(true);
    setError(null);

    try {
      console.log("🔄 Confirmation du paiement:", payment.id);

      // Mettre à jour le statut du paiement
      const response = await fetch(`/api/payment/${payment.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          confirmed_at: new Date().toISOString(),
        }),
      });

      console.log(
        "📡 Réponse confirmation:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Erreur ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Confirmation réussie:", result);

      setPayment({ ...payment, status: "completed" });

      // Rediriger après confirmation
      setTimeout(() => {
        navigate("/success");
      }, 2000);
    } catch (err) {
      console.error("❌ Erreur confirmation:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la confirmation du paiement"
      );
    } finally {
      setConfirming(false);
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
          <p>La transaction a été enregistrée et sera traitée.</p>
        </div>
      ) : (
        <>
          {(payment.sender_chain.includes("Sepolia") ||
            payment.recipient_chain.includes("Sepolia")) && (
            <div className="testnet-warning">
              <h3>🚨 RÉSEAU DE TEST SEPOLIA</h3>
              <p>
                Cette transaction utilise des ETH de test sans valeur réelle.
              </p>
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
                <h4>🔗 Vos wallets connectés:</h4>
                {wallets.map((wallet, index) => (
                  <div key={index} className="wallet-item">
                    <code>{wallet.address}</code>
                    <span>({wallet.walletClientType})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="confirmation-actions">
            <button
              onClick={confirmPayment}
              disabled={confirming}
              className="confirm-button"
            >
              {confirming ? "🔄 Confirmation..." : "✅ Confirmer le paiement"}
            </button>

            <button onClick={() => navigate("/")} className="cancel-button">
              ❌ Annuler
            </button>
          </div>

          <div className="warning">
            <p>
              ⚠️ <strong>Important:</strong> Cette action confirmera la demande
              de paiement. La transaction réelle devra être effectuée via votre
              wallet externe.
            </p>
            {payment.sender_chain.includes("Sepolia") && (
              <p>
                🚨 <strong>Testnet:</strong> Assurez-vous que votre wallet est
                connecté au réseau Sepolia.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PaymentConfirmation;
