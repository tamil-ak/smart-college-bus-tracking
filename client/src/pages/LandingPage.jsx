import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import Button from '../components/Button';
import FeatureBadge from '../components/FeatureBadge';
import CampusIllustration from '../components/CampusIllustration';
import '../styles/landing.css';
import '../styles/components.css';

/**
 * Enhanced Premium CBTS Landing Page
 */
const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleSignIn = () => {
    console.log('Navigate to Sign In');
    // Implement sign in navigation or modal open here
  };

  const handleSignUp = () => {
    navigate('/choose-role');
  };

  return (
    <div className="cbts-landing-wrapper">
      {/* 1. Sticky Responsive Navbar */}
      <Navbar />

      {/* 2. Background Blob Animations */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      {/* 3. Main Center Hero Area */}
      <main className="cbts-main-content">
        <div className="cbts-card-wrapper">
          {/* Subtle design accents floating around the card */}
          <div className="cbts-glass-accent-1" aria-hidden="true"></div>
          <div className="cbts-glass-accent-2" aria-hidden="true"></div>
          
          <div className="cbts-hero-card">
            {/* Centered Professional SVG Logo (with Float Animation) */}
            <Logo />

            {/* Typography Headers */}
            <h1 className="cbts-title-main">CBTS</h1>
            <h2 className="cbts-title-sub">College Bus Tracking System</h2>
            <p className="cbts-tagline">Track. Connect. Travel Smart.</p>

            {/* Three Feature Badges */}
            <div className="cbts-badges-container">
              <FeatureBadge label="Safe" />
              <FeatureBadge label="Reliable" />
              <FeatureBadge label="On Time" />
            </div>

            {/* Premium Call to Action Buttons */}
            <div className="cbts-btn-group">
              <Button variant="primary" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button variant="secondary" onClick={handleSignUp}>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Bottom Campus Line-Art Illustration */}
      <div style={{ width: '100%', zIndex: 2 }}>
        <CampusIllustration />
      </div>

      {/* 5. Semantic Page Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
