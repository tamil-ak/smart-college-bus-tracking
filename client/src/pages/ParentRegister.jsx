import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/register.css';

/**
 * Parent Registration Page with Student Register Number Mapping
 */
const ParentRegister = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);

  // Form Fields State
  const [formFields, setFormFields] = useState({
    name: '',
    email: '',
    phone: '',
    childRegisterNumber: '',
    password: '',
    confirmPassword: '',
    collegeId: '',
    agreeTerms: false,
  });

  // Fetch available colleges
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/colleges/all");
        if (res.data && res.data.colleges) {
          setColleges(res.data.colleges);
          if (res.data.colleges.length > 0) {
            setFormFields((prev) => ({ ...prev, collegeId: res.data.colleges[0]._id }));
          }
        }
      } catch (err) {
        console.error("Failed to load colleges:", err);
      }
    };
    fetchColleges();
  }, []);

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toggle Popup Modal State
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredParent, setRegisteredParent] = useState(null);

  // Field change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setGlobalError('');
  };

  // Form Validation Logic
  const validateForm = () => {
    const tempErrors = {};
    let isValid = true;

    if (!formFields.name || formFields.name.trim() === '') {
      tempErrors.name = 'Parent Name is required';
      isValid = false;
    }

    if (!formFields.email || formFields.email.trim() === '') {
      tempErrors.email = 'Email address is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formFields.email.trim())) {
        tempErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    if (!formFields.phone || formFields.phone.trim() === '') {
      tempErrors.phone = 'Phone number is required';
      isValid = false;
    }

    if (!formFields.childRegisterNumber || formFields.childRegisterNumber.trim() === '') {
      tempErrors.childRegisterNumber = 'Child Student Register Number is required';
      isValid = false;
    }

    if (!formFields.collegeId) {
      tempErrors.collegeId = 'College selection is required';
      isValid = false;
    }

    if (!formFields.password || formFields.password.trim() === '') {
      tempErrors.password = 'Password is required';
      isValid = false;
    } else if (formFields.password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (formFields.password !== formFields.confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!formFields.agreeTerms) {
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setGlobalError('');

      const payload = {
        name: formFields.name.trim(),
        email: formFields.email.trim(),
        phone: formFields.phone.trim(),
        childRegisterNumber: formFields.childRegisterNumber.trim(),
        password: formFields.password,
        collegeId: formFields.collegeId,
      };

      const response = await axios.post('http://localhost:5000/api/auth/register/parent', payload);

      if (response.data && response.data.success) {
        setRegisteredParent(response.data.user);
        setShowSuccess(true);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        setTimeout(() => {
          setShowSuccess(false);
          navigate('/parent-dashboard');
        }, 2200);
      }
    } catch (err) {
      console.error('Parent registration error:', err);
      const serverMessage = err.response?.data?.message || 'Registration failed. Please check your connection.';
      setGlobalError(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cbts-landing-wrapper cbts-register-page-wrapper">
      {/* Back Button */}
      <button className="cbts-btn-back" onClick={() => navigate('/choose-role')} aria-label="Go back to role selection">
        <span className="back-arrow">&larr;</span> Back
      </button>

      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      {/* Main Content Area */}
      <main className="cbts-register-main-content">
        <div className="cbts-register-card">
          {/* Header */}
          <header className="cbts-register-header">
            <h1 className="cbts-register-title">Parent Registration</h1>
            <p className="cbts-register-subtitle">
              Register your parent account to monitor your child's transport and bus details.
            </p>
          </header>

          {/* Error Banner */}
          {globalError && (
            <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{globalError}</span>
            </div>
          )}

          {/* Form */}
          <form className="cbts-register-form" onSubmit={handleSubmit} noValidate>
            <div className="cbts-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* Select College */}
              <div className={`cbts-form-group grid-span-full ${errors.collegeId ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="collegeId">
                  Select College <span className="cbts-required-star">*</span>
                </label>
                <select
                  id="collegeId"
                  name="collegeId"
                  className="cbts-form-input"
                  value={formFields.collegeId}
                  onChange={handleChange}
                  required
                >
                  {colleges.length === 0 && <option value="">Loading colleges...</option>}
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {errors.collegeId && <span className="cbts-error-text">{errors.collegeId}</span>}
              </div>

              {/* Parent Full Name */}
              <div className={`cbts-form-group ${errors.name ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="name">
                  Parent Full Name <span className="cbts-required-star">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formFields.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="cbts-form-input"
                />
                {errors.name && <span className="cbts-field-error">{errors.name}</span>}
              </div>

              {/* Child Register Number */}
              <div className={`cbts-form-group ${errors.childRegisterNumber ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="childRegisterNumber">
                  Child Student Register No <span className="cbts-required-star">*</span>
                </label>
                <input
                  type="text"
                  id="childRegisterNumber"
                  name="childRegisterNumber"
                  value={formFields.childRegisterNumber}
                  onChange={handleChange}
                  placeholder="e.g. 25CSR348"
                  className="cbts-form-input"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.childRegisterNumber ? (
                  <span className="cbts-field-error">{errors.childRegisterNumber}</span>
                ) : (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dark-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Enter your child's official college register number.
                  </span>
                )}
              </div>

              {/* Email Address */}
              <div className={`cbts-form-group ${errors.email ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="email">
                  Email Address <span className="cbts-required-star">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formFields.email}
                  onChange={handleChange}
                  placeholder="e.g. parent@example.com"
                  className="cbts-form-input"
                />
                {errors.email && <span className="cbts-field-error">{errors.email}</span>}
              </div>

              {/* Phone Number */}
              <div className={`cbts-form-group ${errors.phone ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="phone">
                  Phone Number <span className="cbts-required-star">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formFields.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="cbts-form-input"
                />
                {errors.phone && <span className="cbts-field-error">{errors.phone}</span>}
              </div>

              {/* Password */}
              <div className={`cbts-form-group ${errors.password ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="password">
                  Password <span className="cbts-required-star">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formFields.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="cbts-form-input"
                />
                {errors.password && <span className="cbts-field-error">{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div className={`cbts-form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="confirmPassword">
                  Confirm Password <span className="cbts-required-star">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formFields.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="cbts-form-input"
                />
                {errors.confirmPassword && <span className="cbts-field-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className={`cbts-checkbox-group ${errors.agreeTerms ? 'has-error' : ''}`} style={{ marginTop: '0.5rem' }}>
              <label className="cbts-checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formFields.agreeTerms}
                  onChange={handleChange}
                  className="cbts-checkbox-input"
                />
                <span className="cbts-checkbox-text">
                  I agree to the <Link to="#" className="cbts-form-link">Terms & Conditions</Link> and transport safety policies.
                </span>
              </label>
              {errors.agreeTerms && <span className="cbts-field-error" style={{ display: 'block', marginTop: '0.25rem' }}>{errors.agreeTerms}</span>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="cbts-btn cbts-btn-primary cbts-btn-submit"
              disabled={submitting}
              style={{ marginTop: '0.75rem' }}
            >
              {submitting ? 'Verifying Student & Registering...' : 'Register & Link Student'}
            </button>
          </form>

          {/* Login Link */}
          <footer className="cbts-register-footer" style={{ marginTop: '1.5rem' }}>
            <p className="cbts-footer-prompt">
              Already have an account?{' '}
              <Link to="/login/student" className="cbts-form-link">
                Sign In
              </Link>
            </p>
          </footer>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccess && (
        <div className="cbts-modal-overlay">
          <div className="cbts-success-modal" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="cbts-modal-icon-container" style={{ background: '#ECFDF5', color: '#10B981' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="cbts-modal-title" style={{ fontSize: '1.35rem', color: '#065F46' }}>
              Registration Successful!
            </h2>
            <p className="cbts-modal-text" style={{ fontSize: '0.92rem', color: 'var(--text-dark-secondary)' }}>
              Your parent account has been linked to student{' '}
              <strong>{registeredParent?.studentId?.name || formFields.childRegisterNumber}</strong> (
              {registeredParent?.studentId?.registerNumber || formFields.childRegisterNumber}).
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dark-muted)', margin: '0.5rem 0 0' }}>
              Redirecting to Parent Dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ParentRegister;
