import React, { useState, useEffect } from "react";
import { usePrivy, useLinkAccount } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import "./LinkAccounts.css";

interface SocialNetwork {
  id: string;
  name: string;
  logoUrl: string;
  color: string;
  description: string;
  isConnected: boolean;
  connectedAccount?: {
    username?: string;
    email?: string;
    address?: string;
  };
}

const socialNetworks: SocialNetwork[] = [
  {
    id: "google",
    name: "Google",
    logoUrl: "https://developers.google.com/identity/images/g-logo.png",
    color: "#4285f4",
    description: "Gmail and Google services access",
    isConnected: false,
  },
  {
    id: "custom",
    name: "Custom Auth",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/159/159478.png",
    color: "#6b7280",
    description: "Custom authentication",
    isConnected: false,
  },
  {
    id: "discord",
    name: "Discord",
    logoUrl:
      "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6ca814282eca7172c6_icon_clyde_white_RGB.svg",
    color: "#5865f2",
    description: "Gaming communication platform",
    isConnected: false,
  },
  {
    id: "email",
    name: "Email",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
    color: "#059669",
    description: "Primary email address",
    isConnected: false,
  },
  {
    id: "farcaster",
    name: "Farcaster",
    logoUrl:
      "https://docs.farcaster.xyz/assets/images/fc-logo-600x600-bd14701acc854d6e91cb30b1c1b0e797.png",
    color: "#8b5cf6",
    description: "Decentralized social network",
    isConnected: false,
  },
  {
    id: "github",
    name: "GitHub",
    logoUrl:
      "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    color: "#24292e",
    description: "Development platform",
    isConnected: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/800px-LinkedIn_logo_initials.png",
    color: "#0077b5",
    description: "Professional network",
    isConnected: false,
  },
  {
    id: "phone",
    name: "Phone",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/159/159832.png",
    color: "#10b981",
    description: "Mobile phone number",
    isConnected: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    logoUrl:
      "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png",
    color: "#fe2c55",
    description: "Short video platform",
    isConnected: false,
  },
  {
    id: "line",
    name: "Line",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/LINE_logo.svg/2048px-LINE_logo.svg.png",
    color: "#00b900",
    description: "Popular messaging app in Asia",
    isConnected: false,
  },
  {
    id: "twitter",
    name: "Twitter (X)",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png",
    color: "#1da1f2",
    description: "Micro-blogging social network",
    isConnected: false,
  },
  {
    id: "wallet",
    name: "Crypto Wallet",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/8968/8968205.png",
    color: "#f59e0b",
    description: "Cryptocurrency wallets",
    isConnected: false,
  },
];

const LinkAccounts: React.FC = () => {
  const [networks, setNetworks] = useState<SocialNetwork[]>(socialNetworks);
  const [isLoading, setIsLoading] = useState(false);
  const { user, authenticated } = usePrivy();
  const navigate = useNavigate();

  // Privy linking hooks
  const {
    linkDiscord,
    linkGoogle,
    linkTwitter,
    linkGithub,
    linkEmail,
    linkPhone,
    linkWallet,
  } = useLinkAccount();

  useEffect(() => {
    if (!authenticated) {
      navigate("/");
      return;
    }
  }, [authenticated, navigate]);

  // Real-time update when user data changes
  useEffect(() => {
    if (user?.linkedAccounts) {
      const updatedNetworks = networks.map((network) => {
        const linkedAccount = user.linkedAccounts?.find((account) => {
          switch (network.id) {
            case "discord":
              return account.type === "discord_oauth";
            case "github":
              return account.type === "github_oauth";
            case "twitter":
              return account.type === "twitter_oauth";
            case "google":
              return account.type === "google_oauth";
            case "email":
              return account.type === "email";
            case "phone":
              return account.type === "phone";
            case "wallet":
              return account.type === "wallet";
            default:
              return false;
          }
        });

        if (linkedAccount) {
          // Safely extract account information based on account type
          const getAccountInfo = () => {
            if (linkedAccount.type === "wallet") {
              const walletAccount = linkedAccount as any;
              return {
                username: undefined,
                email: undefined,
                address: walletAccount.address,
              };
            } else if (linkedAccount.type === "email") {
              const emailAccount = linkedAccount as any;
              return {
                username: undefined,
                email: emailAccount.address,
                address: undefined,
              };
            } else if (linkedAccount.type === "phone") {
              const phoneAccount = linkedAccount as any;
              return {
                username: undefined,
                email: undefined,
                address: phoneAccount.number, // Use 'number' instead of 'phoneNumber'
              };
            } else {
              // For OAuth accounts (discord, twitter, github, google)
              const oauthAccount = linkedAccount as any;
              return {
                username: oauthAccount.username || oauthAccount.subject,
                email: oauthAccount.email || undefined,
                address: undefined,
              };
            }
          };

          return {
            ...network,
            isConnected: true,
            connectedAccount: getAccountInfo(),
          };
        }
        return { ...network, isConnected: false, connectedAccount: undefined };
      });

      setNetworks(updatedNetworks);
    }
  }, [user?.linkedAccounts]);

  const handleConnect = async (networkId: string) => {
    setIsLoading(true);

    try {
      console.log(`Connexion à ${networkId}...`);

      let success = false;

      switch (networkId) {
        case "discord":
          await linkDiscord();
          success = true;
          break;

        case "google":
          await linkGoogle();
          success = true;
          break;

        case "twitter":
          await linkTwitter();
          success = true;
          break;

        case "github":
          await linkGithub();
          success = true;
          break;

        case "email":
          await linkEmail();
          success = true;
          break;

        case "phone":
          await linkPhone();
          success = true;
          break;

        case "wallet":
          await linkWallet();
          success = true;
          break;

        default:
          // For networks not yet supported by Privy
          console.log(`${networkId} linking not yet implemented in Privy`);
          alert(
            `Connection to ${getNetworkName(networkId)} will be available soon!`
          );
          success = false;
      }

      if (success) {
        console.log(`${networkId} connecté avec succès`);
        // Note: The actual update will happen via the useEffect that watches user.linkedAccounts
      }
    } catch (error: any) {
      console.error(`Erreur lors de la connexion à ${networkId}:`, error);

      // Handle specific error messages
      if (error.message?.includes("User rejected")) {
        console.log("Connexion annulée par l'utilisateur");
      } else if (error.message?.includes("already linked")) {
        console.log("Ce compte est déjà lié");
      } else {
        alert(
          `Error connecting to ${getNetworkName(networkId)}: ${error.message}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (networkId: string) => {
    try {
      console.log(`Déconnexion de ${networkId}...`);

      // For now, show a message that unlinking should be done through Privy dashboard
      alert(
        `To disconnect ${getNetworkName(
          networkId
        )}, please use the Privy dashboard or contact support.`
      );
    } catch (error: any) {
      console.error(`Erreur lors de la déconnexion de ${networkId}:`, error);
      alert(
        `Error disconnecting from ${getNetworkName(networkId)}: ${
          error.message
        }`
      );
    }
  };

  const getNetworkName = (networkId: string) => {
    const network = networks.find((n) => n.id === networkId);
    return network?.name || networkId;
  };

  const connectedCount = networks.filter((n) => n.isConnected).length;

  if (!authenticated) {
    return null;
  }

  return (
    <div className="link-accounts-container">
      <div className="link-accounts-header">
        <h1>Link Your Accounts</h1>
        <p>
          Connect your favorite social networks and services for a unified
          experience.
          <span className="connected-count">
            {connectedCount} account(s) connected
          </span>
        </p>
      </div>

      <div className="networks-grid">
        {networks.map((network) => (
          <div
            key={network.id}
            className={`network-card ${network.isConnected ? "connected" : ""}`}
            style={{ "--network-color": network.color } as React.CSSProperties}
            data-network={network.id}
          >
            <div className="network-header">
              <div className="network-logo-wrapper">
                <img
                  src={network.logoUrl}
                  alt={`${network.name} logo`}
                  className="network-logo"
                  onError={(e) => {
                    // Fallback to a generic icon if logo fails to load
                    e.currentTarget.src =
                      "https://cdn-icons-png.flaticon.com/512/159/159478.png";
                  }}
                />
              </div>
              <div className="network-status">
                {network.isConnected ? (
                  <span className="status-connected">Connected</span>
                ) : (
                  <span className="status-disconnected">Disconnected</span>
                )}
              </div>
            </div>

            <div className="network-info">
              <h3 className="network-name">{network.name}</h3>
              <p className="network-description">{network.description}</p>

              {network.isConnected && network.connectedAccount && (
                <div className="connected-info">
                  {network.connectedAccount.username && (
                    <p className="connected-username">
                      User: {network.connectedAccount.username}
                    </p>
                  )}
                  {network.connectedAccount.email && (
                    <p className="connected-email">
                      Email: {network.connectedAccount.email}
                    </p>
                  )}
                  {network.connectedAccount.address && (
                    <p className="connected-address">
                      {network.id === "wallet"
                        ? "Address: "
                        : network.id === "phone"
                        ? "Phone: "
                        : "ID: "}
                      {network.connectedAccount.address.length > 20
                        ? `${network.connectedAccount.address.slice(
                            0,
                            10
                          )}...${network.connectedAccount.address.slice(-8)}`
                        : network.connectedAccount.address}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="network-actions" style={{ marginTop: "auto" }}>
              {network.isConnected ? (
                <button
                  className="btn-disconnect"
                  onClick={() => handleDisconnect(network.id)}
                  disabled={isLoading}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className="btn-connect"
                  onClick={() => handleConnect(network.id)}
                  disabled={isLoading}
                >
                  {isLoading ? "Connecting..." : `Connect`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="link-accounts-footer">
        <div className="security-notice">
          <h3>Security and Privacy</h3>
          <p>
            Your data is protected by Privy with enterprise-level encryption. We
            only store information necessary for authentication.
          </p>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
            }}
          >
            <strong>Tip:</strong> The more accounts you link, the more secure
            your profile will be and you'll have more recovery options.
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            <strong>Note:</strong> Account disconnection must be done via the
            Privy dashboard for security reasons.
          </p>
        </div>

        <div className="footer-actions">
          <button className="btn-back" onClick={() => navigate("/")}>
            ← Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkAccounts;
