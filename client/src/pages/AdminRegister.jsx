import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/register.css';

/**
 * College Admin Registration Request Page
 */
const AdminRegister = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);

  // Form State
  const [formFields, setFormFields] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    collegeId: '',
  });

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setGlobalError('');
  };

  const validateForm = () => {
    const tempErrors = {};
    let isValid = true;

    if (!formFields.name || !formFields.name.trim()) {
      tempErrors.name = 'Full Name is required';
      isValid = false;
    }

    if (!formFields.email || !formFields.email.trim()) {
      tempErrors.email = 'Email Address is required';
      isValid = false;
    }

    if (!formFields.password) {
      tempErrors.password = 'Password is required';
      isValid = false;
    }

    if (formFields.password !== formFields.confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!formFields.collegeId) {
      tempErrors.collegeId = 'College selection is required';
      isValid = false;
    }

    setErrors(tempErrors);
    if (!isValid) {
      setGlobalError('Please fix the errors in the form before submitting.');
    }
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setGlobalError('');

      const payload = {
        name: formFields.name.trim(),
        email: formFields.email.trim(),
        password: formFields.password,
        phone: formFields.phone.trim(),
        collegeId: formFields.collegeId,
      };

      const response = await axios.post('http://localhost:5000/api/auth/register/admin', payload);

      if (response.data && response.data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigate('/login/admin');
        }, 2500);
      }
    } catch (err) {
      console.error('Admin registration error:', err);
      setGlobalError(err.response?.data?.message || 'Failed to submit registration request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cbts-landing-wrapper cbts-register-wrapper">
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-main-content">
        <div className="cbts-register-card">
          <div className="cbts-register-header">
            <h1 className="cbts-register-title">College Admin Registration</h1>
            <p className="cbts-register-subtitle">
              Request access to manage bus tracking, assignments, and fees for your college campus.
            </p>
          </div>

          {globalError && (
            <div className="cbts-form-alert" role="alert">
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="cbts-form-grid">
              {/* Select College */}
              <div className={`cbts-form-group grid-span-full ${errors.collegeId ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="collegeId">Select College *</label>
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
                      🏛️ {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {errors.collegeId && <span className="cbts-error-text">{errors.collegeId}</span>}
              </div>

              {/* Full Name */}
              <div className={`cbts-form-group grid-span-full ${errors.name ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="cbts-form-input"
                  placeholder="Prof. Administrator"
                  value={formFields.name}
                  onChange={handleChange}
                  required
                />
                {errors.name && <span className="cbts-error-text">{errors.name}</span>}
              </div>

              {/* Email */}
              <div className={`cbts-form-group ${errors.email ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="cbts-form-input"
                  placeholder="admin@college.edu"
                  value={formFields.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <span className="cbts-error-text">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="cbts-form-group">
                <label className="cbts-form-label" htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  className="cbts-form-input"
                  placeholder="9876543210"
                  value={formFields.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Password */}
              <div className={`cbts-form-group ${errors.password ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="cbts-form-input"
                  placeholder="Create password"
                  value={formFields.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <span className="cbts-error-text">{errors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div className={`cbts-form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                <label className="cbts-form-label" htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="cbts-form-input"
                  placeholder="Confirm password"
                  value={formFields.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {errors.confirmPassword && <span className="cbts-error-text">{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="cbts-form-actions" style={{ marginTop: '2rem' }}>
              <button type="submit" className="cbts-btn cbts-btn-primary" disabled={submitting}>
                {submitting ? 'Submitting Request...' : 'Submit Admin Access Request'}
              </button>
              <button type="button" className="cbts-btn cbts-btn-secondary" onClick={() => navigate('/login/admin')}>
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Success Overlay Modal */}
      {showSuccess && (
        <div className="cbts-modal-overlay">
          <div className="cbts-modal-card">
            <h2 className="cbts-modal-title">Request Submitted!</h2>
            <p className="cbts-modal-subtitle">
              Your College Admin registration request was submitted successfully with status <strong>Pending</strong>. Please wait for Super Admin approval before signing in.
            </p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminRegister;
