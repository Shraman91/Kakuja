import React from 'react';
import { BookOpen, ExternalLink, GitBranch } from 'lucide-react';
import './Navbar.css';

interface NavbarProps {
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onHomeClick }) => {
  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo & Title */}
        <div className="navbar-brand" onClick={onHomeClick} role="button" tabIndex={0}>
          <div className="brand-logo-icon">
            <BookOpen size={20} className="logo-svg" />
          </div>
          <div className="brand-text">
            <span className="brand-name">Paper Crawler</span>
            <span className="brand-badge">arXiv & pgvector</span>
          </div>
        </div>

        {/* Action Links */}
        <nav className="navbar-nav">
          <button type="button" className="nav-link-btn" onClick={onHomeClick}>
            Library
          </button>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-btn"
          >
            <span>API Docs</span>
            <ExternalLink size={13} />
          </a>
          <a
            href="https://github.com/Shraman91/Kakuja"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-btn gh-link"
          >
            <GitBranch size={14} />
            <span>GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
