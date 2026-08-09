import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/register.css';

/**
 * Student Login Page for CBTS
 */
const StudentLogin = () => {
  const navigate = useNavigate();

  // Form Fields State
  const [formFields, setFormFields] = useState({
    identifier: '',
    password: '',
  });

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Toggle Popup Modal State
  const [showSuccess, setShowSuccess] = useState(false);

  // Field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setGlobalError('');
  };

  // Form Validation Logic
  const validateForm = () => {
    const tempErrors = {};
    let isValid = true;

    if (!formFields.identifier || formFields.identifier.trim() === '') {
      tempErrors.identifier = 'Email or Register Number is required';
      isValid = false;
    }

    if (!formFields.password || formFields.password.trim() === '') {
      tempErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(tempErrors);

    if (!isValid) {
      setGlobalError('Please fix the errors in the form before submitting.');
    }

    return isValid;
  };

  // Form Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      const loginData = {
        identifier: formFields.identifier,
        password: formFields.password
      };

      console.log("Sending login request data:", loginData);

      try {
        setGlobalError('');
        const response = await axios.post("http://localhost:5000/api/auth/login/student", loginData);
        console.log("Login response:", response);

        setSuccessMessage(response.data?.message || 'Login successful');
        setShowSuccess(true);
        
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setTimeout(() => {
          setShowSuccess(false);
          if (response.data?.user?.role === "admin") {
            navigate('/admin');
          } else {
            navigate('/student-dashboard');
          }
        }, 2000);
      } catch (err) {
        console.error("Axios login error:", err);
        if (err.response) {
          setGlobalError(err.response.data?.message || 'Login failed');
        } else {
          setGlobalError('Cannot connect to backend server.');
        }
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="cbts-landing-wrapper cbts-register-wrapper">
      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      {/* Main Container */}
      <main className="cbts-main-content">
        <div className="cbts-register-card">
          <div className="cbts-register-header">
            <h1 className="cbts-register-title">Student Sign In</h1>
            <p className="cbts-register-subtitle">Enter your college email or register number to log in.</p>
          </div>

          {/* Global Alert Banner */}
          {globalError && (
            <div className="cbts-form-alert" role="alert">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="cbts-form-grid">
              {/* Email / Register Number */}
              <div className={`cbts-form-group grid-span-full ${errors.identifier ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="identifier">College Email / Register Number</label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  className="cbts-form-input"
                  placeholder="student@college.edu or 3122XXXXXXXX"
                  value={formFields.identifier}
                  onChange={handleChange}
                  required
                />
                {errors.identifier && <span className="cbts-error-text">{errors.identifier}</span>}
              </div>

              {/* Password */}
              <div className={`cbts-form-group grid-span-full ${errors.password ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="cbts-form-input"
                  placeholder="Enter your password"
                  value={formFields.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <span className="cbts-error-text">{errors.password}</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="cbts-form-actions" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <button type="submit" className="cbts-btn cbts-btn-primary" style={{ flex: 1 }}>
                  Sign In
                </button>
                <button type="button" className="cbts-btn cbts-btn-secondary" onClick={handleBack} style={{ flex: 1 }}>
                  Back
                </button>
              </div>
              <button 
                type="button" 
                className="cbts-btn cbts-btn-secondary" 
                onClick={() => navigate('/login/admin')}
                style={{ width: '100%', borderColor: 'rgba(11, 61, 145, 0.18)', color: 'var(--primary-navy)' }}
              >
                Admin Login
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal Overlay */}
      {showSuccess && (
        <div className="cbts-modal-overlay">
          <div className="cbts-modal-card">
            <div className="cbts-modal-icon-container">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cbts-modal-icon-svg"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="cbts-modal-title">{successMessage}</h2>
            <p className="cbts-modal-subtitle">Welcome back!</p>
          </div>
        </div>
      )}

      {/* Shared Copyright Footer */}
      <Footer />
    </div>
  );
};

export default StudentLogin;
