import React, { useState, useRef, useEffect } from "react";
import { usePrivy, useLogout } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import "./UserDropdown.css";

interface LinkedAccount {
  type: string;
  username?: string;
  email?: string;
  subject?: string;
  address?: string;
}

interface UserDropdownProps {
  onToggle?: () => void; // Callback pour fermer le dropdown réseau
}

const UserDropdown: React.FC<UserDropdownProps> = ({ onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, authenticated } = usePrivy();
  const { logout } = useLogout();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Écouter l'événement pour fermer le dropdown utilisateur
  useEffect(() => {
    const handleCloseUser = () => {
      setIsOpen(false);
    };

    window.addEventListener("closeUserDropdown", handleCloseUser);
    return () => {
      window.removeEventListener("closeUserDropdown", handleCloseUser);
    };
  }, []);

  // Fonction pour ouvrir/fermer le dropdown et fermer l'autre
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    // Fermer le dropdown réseau si on ouvre le dropdown utilisateur
    if (!isOpen && onToggle) {
      onToggle();
      // Émettre un événement pour fermer le dropdown réseau
      window.dispatchEvent(new CustomEvent("closeNetworkDropdown"));
    }
  };

  useEffect(() => {
    if (user) {
      // Extract linked accounts from user data
      const accounts: LinkedAccount[] = [];

      // Add email if available
      if (user.email?.address) {
        accounts.push({
          type: "email",
          email: user.email.address,
        });
      }

      // Add phone if available
      if (user.phone?.number) {
        accounts.push({
          type: "phone",
          subject: user.phone.number,
        });
      }

      // Add wallet accounts
      if (user.linkedAccounts) {
        user.linkedAccounts.forEach((account) => {
          if (account.type === "discord_oauth") {
            const discordAccount = account as any; // Type assertion pour accéder aux propriétés spécifiques
            accounts.push({
              type: "discord",
              username: discordAccount.username || discordAccount.subject,
              subject: discordAccount.subject,
            });
          } else if (account.type === "github_oauth") {
            const githubAccount = account as any;
            accounts.push({
              type: "github",
              username: githubAccount.username || githubAccount.subject,
              subject: githubAccount.subject,
            });
          } else if (account.type === "twitter_oauth") {
            const twitterAccount = account as any;
            accounts.push({
              type: "twitter",
              username: twitterAccount.username || twitterAccount.subject,
              subject: twitterAccount.subject,
            });
          } else if (account.type === "google_oauth") {
            const googleAccount = account as any;
            accounts.push({
              type: "google",
              email: googleAccount.email || googleAccount.subject,
              subject: googleAccount.subject,
            });
          } else if (account.type === "wallet") {
            const walletAccount = account as any;
            accounts.push({
              type: "wallet",
              address: walletAccount.address,
              subject: walletAccount.address,
            });
          }
        });
      }

      setLinkedAccounts(accounts);
    }
  }, [user]);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "discord":
        return "💬";
      case "github":
        return "🔗";
      case "twitter":
        return "🐦";
      case "google":
        return "📧";
      case "email":
        return "✉️";
      case "phone":
        return "📱";
      default:
        return "🔗";
    }
  };

  const getAccountLabel = (account: LinkedAccount) => {
    switch (account.type) {
      case "discord":
        return account.username || "Discord";
      case "github":
        return account.username || "GitHub";
      case "twitter":
        return account.username || "Twitter";
      case "google":
        return account.email || "Google";
      case "email":
        return account.email || "Email";
      case "phone":
        return account.subject || "Téléphone";
      default:
        return account.subject || account.username || "Compte lié";
    }
  };

  const getDisplayName = () => {
    if (user?.email?.address) {
      return user.email.address;
    }
    if (user?.phone?.number) {
      return user.phone.number;
    }
    if (linkedAccounts.length > 0) {
      const firstAccount = linkedAccounts[0];
      return getAccountLabel(firstAccount);
    }
    return "Utilisateur";
  };

  const handleLinkAccounts = () => {
    setIsOpen(false);
    navigate("/link-accounts");
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button className="user-dropdown-button" onClick={toggleDropdown}>
        <div className="user-avatar">
          <span className="user-avatar-icon">👤</span>
        </div>
        <div className="user-info">
          <span className="user-name">{getDisplayName()}</span>
          <span className="user-status">Connected</span>
        </div>
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <div className="user-header-avatar">
              <span className="user-header-icon">👤</span>
            </div>
            <div className="user-header-info">
              <span className="user-header-name">{getDisplayName()}</span>
              <span className="user-header-id">
                ID: {user?.id?.slice(0, 8) || "N/A"}
              </span>
            </div>
          </div>

          {linkedAccounts.length > 0 && (
            <>
              <div className="dropdown-divider"></div>
              <div className="linked-accounts-section">
                <span className="section-title">🔗 Linked accounts</span>
                <div className="linked-accounts-list">
                  {linkedAccounts.map((account, index) => (
                    <div key={index} className="linked-account-item">
                      <span className="account-icon">
                        {getAccountIcon(account.type)}
                      </span>
                      <div className="account-details">
                        <span className="account-name">
                          {getAccountLabel(account)}
                        </span>
                        <span className="account-type">{account.type}</span>
                      </div>
                      <span className="account-status">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="dropdown-divider"></div>

          <div className="user-dropdown-actions">
            <button
              className="dropdown-action-item link-accounts-item"
              onClick={handleLinkAccounts}
            >
              <span className="action-icon">🔗</span>
              <span className="action-label">
                Link my account with more networks
              </span>
            </button>
          </div>

          <div className="dropdown-divider"></div>

          <div className="user-dropdown-actions" style={{ paddingTop: 0 }}>
            <button
              className="dropdown-action-item logout-item"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
            >
              <span className="action-icon">🚪</span>
              <span className="action-label">Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
