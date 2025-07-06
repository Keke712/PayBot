import React from "react";
import "./SocialLinks.css";

interface SocialLink {
  name: string;
  icon: string;
  url: string;
  color: string;
}

const socialLinks: SocialLink[] = [
  {
    name: "Discord",
    icon: "💬",
    url: "https://discord.gg/ethereum",
    color: "#5865f2",
  },
  {
    name: "GitHub",
    icon: "🔗",
    url: "https://github.com/ethereum",
    color: "#24292e",
  },
  {
    name: "Documentation",
    icon: "📚",
    url: "https://docs.privy.io",
    color: "#1da1f2",
  },
  {
    name: "Etherscan",
    icon: "🔍",
    url: "https://etherscan.io",
    color: "#627eea",
  },
];

const SocialLinks: React.FC = () => {
  return (
    <div className="social-links">
      <div className="social-links-container">
        {socialLinks.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            style={{ "--link-color": link.color } as React.CSSProperties}
            title={link.name}
          >
            <span className="social-icon">{link.icon}</span>
            <span className="social-label">{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default SocialLinks;
