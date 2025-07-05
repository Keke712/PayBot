import { PrivyProvider } from "@privy-io/react-auth";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WalletInterface from "./WalletInterface.tsx";
import PaymentConfirmation from "./PaymentConfirmation";
import Success from "./Success";
import "./App.css";

function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || "cmcpc3pra00qbjp0maxxqbqcs"}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#646cff",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <Router>
        <div>
          <h1>PayBot Dashboard</h1>
          <Routes>
            <Route path="/" element={<WalletInterface />} />
            <Route
              path="/confirm-payment/:paymentId"
              element={<PaymentConfirmation />}
            />
            <Route path="/success" element={<Success />} />
          </Routes>
        </div>
      </Router>
    </PrivyProvider>
  );
}

export default App;
