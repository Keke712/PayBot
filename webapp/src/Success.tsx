import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="card success-page">
      <div className="success-icon">✅</div>
      <h2>Paiement Confirmé!</h2>
      <p>Votre demande de paiement a été confirmée avec succès.</p>

      <div className="success-details">
        <h3>🎉 Étapes suivantes:</h3>
        <ul>
          <li>✅ Demande de paiement enregistrée</li>
          <li>🔄 Notification envoyée au destinataire</li>
          <li>💼 Transaction à finaliser via votre wallet</li>
        </ul>
      </div>

      <div className="next-steps">
        <p>
          💡 <strong>Conseil:</strong> Utilisez votre wallet externe pour
          effectuer la transaction réelle vers l'adresse indiquée.
        </p>
      </div>

      <button onClick={() => navigate("/")}>🏠 Retour à l'accueil</button>

      <p className="auto-redirect">
        Redirection automatique dans 5 secondes...
      </p>
    </div>
  );
}

export default Success;
