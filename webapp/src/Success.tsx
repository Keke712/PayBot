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
      <h2>Payment Executed!</h2>
      <p>Your transaction has been sent successfully via Privy.</p>

      <div className="success-details">
        <h3>🎉 Transaction completed:</h3>
        <ul>
          <li>✅ Transaction sent to blockchain</li>
          <li>✅ Confirmed via Privy</li>
          <li>✅ Funds transferred to recipient</li>
          <li>🔄 Being confirmed on network</li>
        </ul>
      </div>

      <div className="next-steps">
        <p>
          💡 <strong>Done!</strong> Your payment has been processed
          automatically by Privy. The transaction is now visible on the
          blockchain.
        </p>
      </div>

      <button onClick={() => navigate("/")}>🏠 Back to home</button>

      <p className="auto-redirect">Automatic redirect in 5 seconds...</p>
    </div>
  );
}

export default Success;
