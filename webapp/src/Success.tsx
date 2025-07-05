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
      <h2>Paiement Exécuté!</h2>
      <p>Votre transaction a été envoyée avec succès via Privy.</p>

      <div className="success-details">
        <h3>🎉 Transaction terminée:</h3>
        <ul>
          <li>✅ Transaction envoyée sur la blockchain</li>
          <li>✅ Confirmée via Privy</li>
          <li>✅ Fonds transférés au destinataire</li>
          <li>🔄 En cours de confirmation sur le réseau</li>
        </ul>
      </div>

      <div className="next-steps">
        <p>
          💡 <strong>Fait!</strong> Votre paiement a été traité automatiquement
          par Privy. La transaction est maintenant visible sur la blockchain.
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
