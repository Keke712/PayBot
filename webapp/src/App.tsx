import { PrivyProvider } from "@privy-io/react-auth";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import WalletInterface from "./WalletInterface.tsx";
import PaymentConfirmation from "./PaymentConfirmation";
import Success from "./Success";
import LinkAccounts from "./components/LinkAccounts";
import SendCrypto from "./components/SendCrypto";
import ReceiveCrypto from "./components/ReceiveCrypto";
import "./App.css";

function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || "cmcpc3pra00qbjp0maxxqbqcs"}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#2563eb",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: {
          id: 11155111, // Sepolia testnet as default
          name: "Sepolia",
          network: "sepolia",
          nativeCurrency: {
            decimals: 18,
            name: "Sepolia Ether",
            symbol: "ETH",
          },
          rpcUrls: {
            default: {
              http: ["https://rpc.sepolia.org"],
            },
            public: {
              http: ["https://rpc.sepolia.org"],
            },
          },
          blockExplorers: {
            default: {
              name: "Etherscan",
              url: "https://sepolia.etherscan.io",
            },
          },
        },
        supportedChains: [
          {
            id: 11155111, // Sepolia
            name: "Sepolia",
            network: "sepolia",
            nativeCurrency: {
              decimals: 18,
              name: "Sepolia Ether",
              symbol: "ETH",
            },
            rpcUrls: {
              default: {
                http: ["https://rpc.sepolia.org"],
              },
              public: {
                http: ["https://rpc.sepolia.org"],
              },
            },
            blockExplorers: {
              default: {
                name: "Etherscan",
                url: "https://sepolia.etherscan.io",
              },
            },
          },
          {
            id: 1, // Ethereum Mainnet
            name: "Ethereum",
            network: "homestead",
            nativeCurrency: {
              decimals: 18,
              name: "Ether",
              symbol: "ETH",
            },
            rpcUrls: {
              default: {
                http: ["https://ethereum-rpc.publicnode.com"],
              },
              public: {
                http: ["https://ethereum-rpc.publicnode.com"],
              },
            },
            blockExplorers: {
              default: {
                name: "Etherscan",
                url: "https://etherscan.io",
              },
            },
          },
        ],
      }}
    >
      <Router>
        <div>
          <Header title="PayBot Dashboard" />
          <Routes>
            <Route path="/" element={<WalletInterface />} />
            <Route
              path="/confirm-payment/:paymentId"
              element={<PaymentConfirmation />}
            />
            <Route path="/success" element={<Success />} />
            <Route path="/link-accounts" element={<LinkAccounts />} />
            <Route path="/send" element={<SendCrypto />} />
            <Route path="/receive" element={<ReceiveCrypto />} />
          </Routes>
        </div>
      </Router>
    </PrivyProvider>
  );
}

export default App;
