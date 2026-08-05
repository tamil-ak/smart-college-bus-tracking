import React from 'react';
import { useNavigate } from 'react-router-dom';
import RoleCard from '../components/RoleCard';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/roleSelection.css';

/**
 * Choose Your Role Page
 */
const RoleSelectionPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const handleSelectRole = (role) => {
    navigate(`/register/${role}`);
  };

  return (
    <div className="cbts-landing-wrapper cbts-role-selection-wrapper">
      {/* Back Button (Glassmorphic) */}
      <button className="cbts-btn-back" onClick={handleBack} aria-label="Go back to landing page">
        <span className="back-arrow">&larr;</span> Back
      </button>

      {/* Background Blob Animations */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      {/* Main Container */}
      <main className="cbts-role-main-content">
        <header className="cbts-role-header">
          <h1 className="cbts-role-title">Choose Your Role</h1>
          <p className="cbts-role-subtitle">Select your role to continue.</p>
        </header>

        {/* Roles Grid */}
        <div className="cbts-roles-grid">
          <RoleCard
            role="student"
            title="Student"
            description="Register to access bus tracking and transport services."
            onContinue={() => handleSelectRole('student')}
          />
          <RoleCard
            role="parent"
            title="Parent"
            description="Monitor your child's bus location and receive notifications."
            onContinue={() => handleSelectRole('parent')}
          />
          <RoleCard
            role="management"
            title="College Management"
            description="Manage buses, students and transport operations."
            onContinue={() => handleSelectRole('management')}
          />
        </div>
      </main>

      {/* Shared Copyright Footer */}
      <Footer />
    </div>
  );
};

export default RoleSelectionPage;
