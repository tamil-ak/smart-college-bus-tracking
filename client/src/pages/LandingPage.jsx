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
 * CBTS landing page
 */
const LandingPage = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/login/student');
  };

  const handleSignUp = () => {
    navigate('/choose-role');
  };

  return (
    <div className="cbts-landing-wrapper">
      {/* 1. Sticky Responsive Navbar */}
      <Navbar />

      {/* Background atmosphere */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      {/* Wide hero area */}
      <main className="cbts-main-content">
        <div className="cbts-hero-content">
          <section className="cbts-hero-copy" aria-labelledby="cbts-title">
            <Logo />
            <h1 id="cbts-title" className="cbts-title-main">CBTS</h1>
            <h2 className="cbts-title-sub">College Bus Tracking System</h2>
            <p className="cbts-tagline">Track. Connect. Travel Smart.</p>
            <div className="cbts-badges-container">
              <FeatureBadge label="Safe" />
              <FeatureBadge label="Reliable" />
              <FeatureBadge label="On Time" />
            </div>
            <div className="cbts-btn-group">
              <Button variant="primary" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button variant="secondary" onClick={handleSignUp}>
                Sign Up
              </Button>
            </div>
          </section>

          <section className="cbts-hero-visual" aria-label="College campus and CBTS bus">
            <div className="cbts-visual-ring" aria-hidden="true"></div>
            <CampusIllustration />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;

