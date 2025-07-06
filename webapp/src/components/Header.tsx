import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import UserDropdown from "./UserDropdown.tsx";
import "./Header.css";

interface HeaderProps {
  title: string;
}

interface Network {
  id: number;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  isTestnet: boolean;
}

const networks: Network[] = [
  {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    icon: "🧪",
    color: "#ff6b35",
    isTestnet: true,
  },
  {
    id: 1,
    name: "Ethereum Mainnet",
    shortName: "Ethereum",
    icon: "⧫",
    color: "#627eea",
    isTestnet: false,
  },
];

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { authenticated } = usePrivy();
  const navigate = useNavigate();
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(networks[0]);

  useEffect(() => {
    // Load initial network
    try {
      const savedNetwork = localStorage.getItem("selectedNetwork");
      if (savedNetwork) {
        const network = JSON.parse(savedNetwork);
        const validNetwork = networks.find((n) => n.id === network.id);
        if (validNetwork) {
          setSelectedNetwork(validNetwork);
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement du réseau:", error);
    }
  }, []);

  // Fonction pour fermer le dropdown réseau
  const closeNetworkDropdown = () => {
    setIsNetworkOpen(false);
  };

  // Fonction pour ouvrir/fermer le dropdown réseau et fermer l'autre
  const toggleNetworkDropdown = () => {
    setIsNetworkOpen(!isNetworkOpen);
    // Émettre un événement pour fermer le dropdown utilisateur
    if (!isNetworkOpen) {
      window.dispatchEvent(new CustomEvent("closeUserDropdown"));
    }
  };

  // Écouter l'événement pour fermer le dropdown réseau
  useEffect(() => {
    const handleCloseNetwork = () => {
      setIsNetworkOpen(false);
    };

    window.addEventListener("closeNetworkDropdown", handleCloseNetwork);
    return () => {
      window.removeEventListener("closeNetworkDropdown", handleCloseNetwork);
    };
  }, []);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isNetworkOpen && !target.closest(".network-selector-integrated")) {
        setIsNetworkOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNetworkOpen]);

  const handleNetworkSelect = (network: Network) => {
    try {
      setSelectedNetwork(network);
      setIsNetworkOpen(false);

      // Store the selected network in localStorage for persistence
      localStorage.setItem("selectedNetwork", JSON.stringify(network));

      console.log(`✅ Réseau sélectionné: ${network.name}`);

      // Emit a custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("networkChanged", {
          detail: { network },
        })
      );
    } catch (error) {
      console.error("❌ Erreur lors de la sélection du réseau:", error);
    }
  };

  const handleTitleClick = () => {
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title" onClick={handleTitleClick}>
            PayBot
            <br />
            Dashboard
          </h1>
        </div>

        <div className="header-right">
          {authenticated && (
            <div
              className="network-selector-integrated"
              onClick={toggleNetworkDropdown}
            >
              <div
                className="network-display"
                data-network={
                  selectedNetwork.id === 11155111 ? "sepolia" : "ethereum"
                }
              >
                <div className="network-info">
                  <span className="network-name">
                    {selectedNetwork.shortName}
                  </span>
                  <span className="network-type">
                    {selectedNetwork.isTestnet ? "Testnet" : "Mainnet"}
                  </span>
                </div>
                {selectedNetwork.isTestnet && (
                  <span className="testnet-badge">TEST</span>
                )}
                <span
                  className={`dropdown-arrow ${isNetworkOpen ? "open" : ""}`}
                >
                  ▼
                </span>
              </div>

              {isNetworkOpen && (
                <div className="network-dropdown-integrated">
                  <div className="network-dropdown-header">
                    <span className="dropdown-title">Select Network</span>
                  </div>

                  <div className="network-list">
                    {networks.map((network) => (
                      <button
                        key={network.id}
                        className={`network-option ${
                          selectedNetwork.id === network.id ? "selected" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNetworkSelect(network);
                        }}
                        style={
                          {
                            "--network-color": network.color,
                          } as React.CSSProperties
                        }
                      >
                        <div className="network-option-content">
                          <div className="network-option-info">
                            <span className="network-option-name">
                              {network.name}
                            </span>
                            <span className="network-option-id">
                              Chain ID: {network.id}
                            </span>
                          </div>
                          <div className="network-option-right">
                            {network.isTestnet && (
                              <span className="network-testnet-badge">
                                TESTNET
                              </span>
                            )}
                            {selectedNetwork.id === network.id && (
                              <span className="network-selected-icon">✓</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="network-dropdown-footer">
                    <p className="network-footer-text">
                      The selected network will be used for new transactions
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {authenticated && <UserDropdown onToggle={closeNetworkDropdown} />}
        </div>
      </div>
    </header>
  );
};

export default Header;
