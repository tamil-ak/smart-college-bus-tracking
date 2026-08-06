import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    setIsOpen(false);
    navigate('/login/student');
  };

  return (
    <nav className="cbts-navbar">
      <div className="cbts-navbar-container">
        {/* Brand/Logo Section */}
        <div className="cbts-nav-brand">
          <svg
            viewBox="0 0 100 100"
            width="32"
            height="32"
            fill="none"
            className="cbts-nav-brand-logo"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="44" stroke="var(--primary-navy)" strokeWidth="8" />
            <polygon points="50,25 70,35 50,45 30,35" fill="var(--primary-navy)" />
            <rect x="35" y="48" width="30" height="24" rx="4" fill="var(--primary-navy)" />
            <rect x="35" y="65" width="30" height="4" fill="var(--primary-yellow)" />
            <circle cx="41" cy="60" r="2.5" fill="var(--primary-yellow)" />
            <circle cx="59" cy="60" r="2.5" fill="var(--primary-yellow)" />
          </svg>
          <span className="cbts-nav-brand-text">CBTS</span>
        </div>

        {/* Desktop Menu Links */}
        <ul className="cbts-nav-links-desktop">
          <li><a href="#home" className="cbts-nav-link active">Home</a></li>
          <li><a href="#features" className="cbts-nav-link">Features</a></li>
          <li><a href="#about" className="cbts-nav-link">About</a></li>
          <li><a href="#contact" className="cbts-nav-link">Contact</a></li>
        </ul>

        {/* Login Button (Desktop) */}
        <div className="cbts-nav-actions-desktop">
          <a href="#login" className="cbts-nav-btn-login" onClick={handleLoginClick}>Login</a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className={`cbts-hamburger ${isOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* Mobile Drawer Navigation overlay */}
      <div className={`cbts-mobile-menu ${isOpen ? 'open' : ''}`}>
        <ul className="cbts-mobile-nav-links">
          <li><a href="#home" className="cbts-mobile-link" onClick={() => setIsOpen(false)}>Home</a></li>
          <li><a href="#features" className="cbts-mobile-link" onClick={() => setIsOpen(false)}>Features</a></li>
          <li><a href="#about" className="cbts-mobile-link" onClick={() => setIsOpen(false)}>About</a></li>
          <li><a href="#contact" className="cbts-mobile-link" onClick={() => setIsOpen(false)}>Contact</a></li>
          <li><a href="#login" className="cbts-mobile-link cbts-mobile-login-btn" onClick={handleLoginClick}>Login</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
