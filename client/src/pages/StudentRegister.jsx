import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/register.css';

/**
 * Student Registration Page for CBTS
 */
const StudentRegister = () => {
  const navigate = useNavigate();

  // Form Fields State
  const [formData, setFormData] = useState({
    fullName: '',
    registerNumber: '',
    department: '',
    year: '',
    section: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  // Toggle Popup Modal State
  const [showSuccess, setShowSuccess] = useState(false);

  // Field change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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

    // 1. Check all required text fields
    const requiredFields = [
      'fullName',
      'registerNumber',
      'department',
      'year',
      'section',
      'email',
      'phone',
      'password',
      'confirmPassword',
    ];

    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === '') {
        tempErrors[field] = 'This field is required';
        isValid = false;
      }
    });

    // 2. Email Validation (Regex check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      tempErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // 3. Password Match Check
    if (formData.password && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        tempErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    // 4. Terms Checkbox Checked Validation
    if (!formData.agreeTerms) {
      tempErrors.agreeTerms = 'You must agree to the Terms & Conditions to register';
      isValid = false;
    }

    setErrors(tempErrors);

    if (!isValid) {
      setGlobalError('Please fix the errors in the form before submitting.');
    }

    return isValid;
  };

  // Form Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Simulate form submission
      setShowSuccess(true);
    }
  };

  const handleBack = () => {
    navigate('/choose-role');
  };

  const handleGoToSignIn = () => {
    setShowSuccess(false);
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
            <h1 className="cbts-register-title">Student Registration</h1>
            <p className="cbts-register-subtitle">Sign up to access college bus routes and schedules.</p>
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
              {/* Full Name */}
              <div className={`cbts-form-group grid-span-full ${errors.fullName ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className="cbts-form-input"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
                {errors.fullName && <span className="cbts-error-text">{errors.fullName}</span>}
              </div>

              {/* Register Number */}
              <div className={`cbts-form-group ${errors.registerNumber ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="registerNumber">Register Number</label>
                <input
                  type="text"
                  id="registerNumber"
                  name="registerNumber"
                  className="cbts-form-input"
                  placeholder="3122XXXXXXXX"
                  value={formData.registerNumber}
                  onChange={handleChange}
                  required
                />
                {errors.registerNumber && <span className="cbts-error-text">{errors.registerNumber}</span>}
              </div>

              {/* Department */}
              <div className={`cbts-form-group ${errors.department ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="department">Department</label>
                <select
                  id="department"
                  name="department"
                  className="cbts-form-select"
                  value={formData.department}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  <option value="CSE">Computer Science & Engineering</option>
                  <option value="IT">Information Technology</option>
                  <option value="ECE">Electronics & Communication</option>
                  <option value="EEE">Electrical & Electronics</option>
                  <option value="MECH">Mechanical Engineering</option>
                  <option value="CIVIL">Civil Engineering</option>
                </select>
                {errors.department && <span className="cbts-error-text">{errors.department}</span>}
              </div>

              {/* Year */}
              <div className={`cbts-form-group ${errors.year ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="year">Year</label>
                <select
                  id="year"
                  name="year"
                  className="cbts-form-select"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                {errors.year && <span className="cbts-error-text">{errors.year}</span>}
              </div>

              {/* Section */}
              <div className={`cbts-form-group ${errors.section ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="section">Section</label>
                <select
                  id="section"
                  name="section"
                  className="cbts-form-select"
                  value={formData.section}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Section</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
                {errors.section && <span className="cbts-error-text">{errors.section}</span>}
              </div>

              {/* College Email */}
              <div className={`cbts-form-group ${errors.email ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="email">College Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="cbts-form-input"
                  placeholder="studentname@college.edu"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <span className="cbts-error-text">{errors.email}</span>}
              </div>

              {/* Phone Number */}
              <div className={`cbts-form-group ${errors.phone ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="cbts-form-input"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                {errors.phone && <span className="cbts-error-text">{errors.phone}</span>}
              </div>

              {/* Password */}
              <div className={`cbts-form-group ${errors.password ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="cbts-form-input"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <span className="cbts-error-text">{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div className={`cbts-form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="cbts-form-input"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {errors.confirmPassword && <span className="cbts-error-text">{errors.confirmPassword}</span>}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className={`cbts-checkbox-group ${errors.agreeTerms ? 'has-error' : ''}`} onClick={() => setFormData(prev => ({...prev, agreeTerms: !prev.agreeTerms}))}>
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                className="cbts-checkbox-input"
                checked={formData.agreeTerms}
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()} // Stop double trigger on label click bubble
                required
              />
              <label className="cbts-checkbox-label" onClick={(e) => e.stopPropagation()}>
                I agree to the <a href="#terms">Terms & Conditions</a>.
              </label>
            </div>
            {errors.agreeTerms && <p className="cbts-error-text" style={{ marginTop: '-1rem', marginBottom: '1.5rem' }}>{errors.agreeTerms}</p>}

            {/* Action Buttons */}
            <div className="cbts-form-actions">
              <button type="submit" className="cbts-btn cbts-btn-primary">
                Register
              </button>
              <button type="button" className="cbts-btn cbts-btn-secondary" onClick={handleBack}>
                Back
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
            <h2 className="cbts-modal-title">Registration submitted successfully.</h2>
            <p className="cbts-modal-subtitle">Your account is pending Admin approval.</p>
            <button 
              className="cbts-btn cbts-btn-primary cbts-modal-btn" 
              onClick={handleGoToSignIn}
              type="button"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      )}

      {/* Shared Copyright Footer */}
      <Footer />
    </div>
  );
};

export default StudentRegister;
