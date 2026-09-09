import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/admin.css';

/**
 * Parent Dashboard - Displays linked child student details and Bus Fee management
 */
const ParentDashboard = () => {
  const navigate = useNavigate();

  const [parentUser, setParentUser] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fee & Payment States
  const [feeData, setFeeData] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState('');

  // Payment Checkout Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payModalError, setPayModalError] = useState('');
  const [paySuccessMessage, setPaySuccessMessage] = useState('');

  // Format currency (INR)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time (e.g. 10:42 AM)
  const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Fetch Parent & Linked Student Profile
  const fetchParentData = async () => {
    try {
      setLoading(true);
      setError('');

      const storedUserStr = localStorage.getItem('user');
      if (!storedUserStr) {
        navigate('/login/student');
        return;
      }

      const storedUser = JSON.parse(storedUserStr);
      setParentUser(storedUser);

      // Fetch fresh data from backend
      const res = await axios.get(`http://localhost:5000/api/auth/parent-student/${storedUser._id}`);
      if (res.data && res.data.success) {
        setParentUser(res.data.user);
        const childStudent = res.data.student;
        setStudentData(childStudent);
        if (childStudent?._id) {
          fetchStudentFee(childStudent._id);
        }
      } else if (storedUser.studentId && typeof storedUser.studentId === 'object') {
        const childStudent = storedUser.studentId;
        setStudentData(childStudent);
        if (childStudent?._id) {
          fetchStudentFee(childStudent._id);
        }
      }
    } catch (err) {
      console.error('Error fetching parent student profile:', err);
      setError(err.response?.data?.message || 'Failed to load linked student data.');
      // Fallback to local storage if present
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.studentId && typeof u.studentId === 'object') {
          setStudentData(u.studentId);
          if (u.studentId._id) {
            fetchStudentFee(u.studentId._id);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Bus Fee status for the linked child student only
  const fetchStudentFee = async (childStudentId) => {
    if (!childStudentId) return;
    try {
      setFeeLoading(true);
      setFeeError('');
      const res = await axios.get(`http://localhost:5000/api/fee/student-fee/${childStudentId}`);
      if (res.data && res.data.success) {
        setFeeData(res.data);
      }
    } catch (err) {
      console.error('Error fetching child bus fee:', err);
      setFeeError(err.response?.data?.message || 'Unable to fetch bus fee status.');
    } finally {
      setFeeLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login/student');
  };

  // Open Direct Payment Checkout Modal
  const handleOpenPayModal = () => {
    setTransactionIdInput('');
    setPayModalError('');
    setPaySuccessMessage('');
    setIsPayModalOpen(true);
  };

  // Handle Parent Direct Payment Submission (UPI UTR / Reference ID)
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!transactionIdInput || transactionIdInput.trim().length < 4) {
      setPayModalError('Please enter a valid UPI Transaction ID / UTR (e.g. 12-digit reference number).');
      return;
    }

    if (!feeData || !feeData.fee || !feeData.bus || !studentData) {
      setPayModalError('Fee or Bus allocation data is missing. Please refresh.');
      return;
    }

    try {
      setPaySubmitting(true);
      setPayModalError('');

      const payload = {
        studentId: studentData._id,
        busId: feeData.bus._id,
        feeId: feeData.fee._id,
        academicYear: feeData.fee.academicYear || '2026-2027',
        amount: feeData.fee.amount,
        transactionId: transactionIdInput.trim(),
        paymentMethod: 'UPI Transfer',
      };

      const res = await axios.post('http://localhost:5000/api/fee/submit-payment', payload);

      if (res.data && res.data.success) {
        setPaySuccessMessage(res.data.message || 'Payment confirmed successfully!');
        // Refresh fee details immediately
        await fetchStudentFee(studentData._id);

        setTimeout(() => {
          setIsPayModalOpen(false);
          setPaySuccessMessage('');
        }, 2000);
      }
    } catch (err) {
      console.error('Payment submission error:', err);
      setPayModalError(err.response?.data?.message || 'Failed to submit payment. Please try again.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const isFeePaid = feeData?.payment?.status === 'Paid';

  return (
    <div className="cbts-landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      {/* Top Navbar */}
      <nav
        className="cbts-student-nav"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(11, 61, 145, 0.1)',
          padding: '0.85rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Logo width={36} height={36} />
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', letterSpacing: '-0.3px', display: 'block', lineHeight: 1.2 }}>
              CBTS
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Parent Portal
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {parentUser && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block' }}>
                {parentUser.name}
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-dark-secondary)' }}>
                Parent Account
              </span>
            </div>
          )}

          <button
            type="button"
            className="cbts-btn cbts-btn-secondary"
            onClick={handleLogout}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '10px',
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="cbts-student-main" style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Welcome, {parentUser?.name || 'Parent'}
              </h1>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.95rem', color: 'var(--text-dark-secondary)' }}>
                Viewing verified student transport allocation, vehicle details, and bus fee status.
                {(parentUser?.collegeId?.name || studentData?.collegeId?.name) && (
                  <span style={{ marginLeft: '10px', background: 'rgba(11, 61, 145, 0.1)', color: 'var(--primary-navy)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    🏛️ {parentUser?.collegeId?.name || studentData?.collegeId?.name}
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              className="cbts-btn cbts-btn-secondary"
              onClick={fetchParentData}
              disabled={loading || feeLoading}
              style={{ padding: '0.55rem 1.15rem', fontSize: '0.86rem', fontWeight: 600, borderRadius: '12px' }}
            >
              {loading || feeLoading ? 'Refreshing...' : '↻ Refresh Data'}
            </button>
          </div>
        </div>

        {error && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="cbts-loader-container" style={{ padding: '4rem 0' }}>
            <div className="cbts-loader-spinner"></div>
            <p className="cbts-loader-text">Loading student information from MongoDB...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* 1. LINKED STUDENT PROFILE CARD */}
            <div className="cbts-student-card" style={{ background: '#ffffff', border: '1.5px solid rgba(11, 61, 145, 0.15)', borderRadius: '22px', padding: '2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    Linked Student Profile
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-secondary)' }}>
                    Student record mapped to this parent account in MongoDB.
                  </p>
                </div>

                <span
                  className="cbts-device-badge cbts-device-badge-registered"
                  style={{
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '0.4rem 0.9rem',
                    background: '#ECFDF5',
                    color: '#065F46',
                    border: '1.5px solid #10B981',
                  }}
                >
                  ● Linked Student Profile ✓
                </span>
              </div>

              {studentData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Linked Child Profile Avatar Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', paddingBottom: '1rem', borderBottom: '1px dashed #E5E7EB' }}>
                    {studentData.profileImage ? (
                      <img
                        src={studentData.profileImage.startsWith('http') ? studentData.profileImage : `http://localhost:5000${studentData.profileImage}`}
                        alt={studentData.name || 'Child Profile'}
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #3B82F6',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                          background: '#ffffff',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem',
                          fontWeight: 800,
                          border: '3px solid #ffffff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        }}
                      >
                        {(studentData.name || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                        {studentData.name}
                      </h3>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-muted)', fontWeight: 600 }}>
                        Reg No: {studentData.registerNumber} • {studentData.department} ({studentData.year} Yr)
                      </p>
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div className="cbts-student-info-grid">
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Student Name</span>
                      <p className="cbts-info-value" style={{ fontWeight: 800, color: 'var(--primary-navy)', fontSize: '1.15rem' }}>
                        {studentData.name}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        Registered Student
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Register Number</span>
                      <p className="cbts-info-value" style={{ fontWeight: 800, color: 'var(--primary-navy)', fontFamily: 'monospace', fontSize: '1.15rem' }}>
                        {studentData.registerNumber}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        College Roll No
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Academic Program</span>
                      <p className="cbts-info-value" style={{ fontWeight: 700 }}>
                        {studentData.department} Department
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        {studentData.year} Year • Section {studentData.section}
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Student Contact</span>
                      <p className="cbts-info-value" style={{ fontWeight: 600 }}>
                        📞 {studentData.phone || 'N/A'}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        {studentData.email || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Transport Allocation Summary */}
                  <div
                    style={{
                      background: 'rgba(11, 61, 145, 0.03)',
                      border: '1.5px solid rgba(11, 61, 145, 0.12)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Transport Fleet Assignment
                      </span>
                      {studentData.busId ? (
                        <span className="cbts-dept-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#065F46', fontWeight: 700 }}>
                          Bus Allocated ✓
                        </span>
                      ) : (
                        <span className="cbts-dept-badge" style={{ background: 'rgba(107, 114, 128, 0.1)', color: '#4B5563', fontWeight: 600 }}>
                          Pending Allocation
                        </span>
                      )}
                    </div>

                    {studentData.busId ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Bus</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary-navy)' }}>
                            Bus {studentData.busId.busNumber}
                          </p>
                        </div>

                        <div>
                          <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Route Details</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 600, color: 'var(--text-dark-primary)' }}>
                            {studentData.busId.route || 'Campus Route'}
                          </p>
                        </div>

                        <div>
                          <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Driver</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                            {studentData.busId.driverName || 'Driver Assigned'}
                          </p>
                        </div>

                        <div>
                          <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Driver Contact</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--primary-navy)' }}>
                            📞 {studentData.busId.driverPhone || 'Contact College Transport'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.88rem' }}>
                        Your child has not been allocated a bus yet by the college transport department.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dark-muted)' }}>
                  <p style={{ margin: 0, fontSize: '0.92rem' }}>No student details found for register number: {parentUser?.childRegisterNumber}</p>
                </div>
              )}
            </div>

            {/* 2. BUS FEE & PAYMENT STATUS CARD */}
            <div className="cbts-student-card" style={{ background: '#ffffff', border: '1.5px solid rgba(11, 61, 145, 0.15)', borderRadius: '22px', padding: '2rem', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💳</span> Bus Transport Fee
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-secondary)' }}>
                    Official fee schedule and verified payment record for {studentData?.name || 'your child'}.
                  </p>
                </div>

                {feeData?.payment ? (
                  isFeePaid ? (
                    <span
                      className="cbts-device-badge cbts-device-badge-registered"
                      style={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        padding: '0.4rem 0.9rem',
                        background: '#ECFDF5',
                        color: '#065F46',
                        border: '1.5px solid #10B981',
                      }}
                    >
                      ● Bus Fee Paid ✓
                    </span>
                  ) : (
                    <span
                      className="cbts-device-badge"
                      style={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        padding: '0.4rem 0.9rem',
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#B45309',
                        border: '1.5px solid rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      ○ Payment Pending (Unpaid)
                    </span>
                  )
                ) : null}
              </div>

              {feeError && (
                <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                  </svg>
                  <span>{feeError}</span>
                </div>
              )}

              {feeLoading ? (
                <div className="cbts-loader-container" style={{ padding: '2.5rem 0' }}>
                  <div className="cbts-loader-spinner"></div>
                  <p className="cbts-loader-text">Loading bus fee details from MongoDB...</p>
                </div>
              ) : !feeData || !feeData.hasAssignedBus ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(11, 61, 145, 0.02)', borderRadius: '16px', border: '1px dashed rgba(11, 61, 145, 0.15)' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-muted)', fontSize: '0.92rem' }}>
                    Your child has not been assigned to a bus route yet. Bus fees will be available once the bus is allocated.
                  </p>
                </div>
              ) : !feeData.hasFeeConfigured ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(11, 61, 145, 0.02)', borderRadius: '16px', border: '1px dashed rgba(11, 61, 145, 0.15)' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-muted)', fontSize: '0.92rem' }}>
                    {feeData.message || 'Fee schedule for this bus route is being finalized by college transport.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Fee Details Grid */}
                  <div className="cbts-student-info-grid">
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Academic Year</span>
                      <p className="cbts-info-value" style={{ fontWeight: 800, color: 'var(--primary-navy)', fontSize: '1.15rem' }}>
                        {feeData.fee?.academicYear || '2026-2027'}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        Current Session
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Assigned Bus</span>
                      <p className="cbts-info-value" style={{ fontWeight: 800, color: 'var(--primary-navy)', fontSize: '1.15rem' }}>
                        Bus {feeData.bus?.busNumber || 'N/A'}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        {feeData.bus?.route || 'Route'}
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Bus Fee Amount</span>
                      <p className="cbts-info-value" style={{ fontWeight: 800, color: '#065F46', fontSize: '1.25rem' }}>
                        {formatCurrency(feeData.fee?.amount)}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        All 1st–4th Year Tariff
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Fee Due Date</span>
                      <p className="cbts-info-value" style={{ fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                        {feeData.fee?.dueDate ? formatDate(feeData.fee.dueDate) : 'End of Semester'}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        Payment Deadline
                      </span>
                    </div>
                  </div>

                  {/* Payment Receipt / Status Banner */}
                  {isFeePaid ? (
                    <div
                      style={{
                        background: '#ECFDF5',
                        border: '1.5px solid #10B981',
                        borderRadius: '16px',
                        padding: '1.35rem 1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ✓ Confirmed Payment Receipt
                        </span>
                        <span className="cbts-dept-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#065F46', fontWeight: 800 }}>
                          Paid: {formatCurrency(feeData.payment?.amount)}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                        <div>
                          <span style={{ color: '#065F46', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Transaction / UTR ID</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 800, fontFamily: 'monospace', fontSize: '1rem', color: 'var(--primary-navy)' }}>
                            {feeData.payment?.transactionId || 'TXN-CONFIRMED'}
                          </p>
                        </div>

                        <div>
                          <span style={{ color: '#065F46', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Paid Date</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                            {formatDate(feeData.payment?.paidAt)}
                          </p>
                        </div>

                        <div>
                          <span style={{ color: '#065F46', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Paid Time</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                            {formatTime(feeData.payment?.paidAt)}
                          </p>
                        </div>

                        <div>
                          <span style={{ color: '#065F46', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Payment Mode</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                            {feeData.payment?.paymentMethod || 'UPI QR Transfer'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.05)',
                        border: '1.5px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '16px',
                        padding: '1.35rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400E' }}>
                          Bus Fee Unpaid ({formatCurrency(feeData.fee?.amount)})
                        </h4>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-secondary)' }}>
                          Please complete payment via the official college UPI QR code to maintain bus transport allocation.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="cbts-btn cbts-btn-primary"
                        onClick={handleOpenPayModal}
                        style={{
                          padding: '0.65rem 1.5rem',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>📱</span> Pay Bus Fee ({formatCurrency(feeData.fee?.amount)})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. PARENT ACCOUNT DETAILS CARD */}
            <div className="cbts-student-card" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Parent Account Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Parent Name</span>
                  <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)', fontSize: '1rem' }}>
                    {parentUser?.name}
                  </p>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Email Address</span>
                  <p style={{ margin: '0.15rem 0 0', fontWeight: 600, color: 'var(--text-dark-primary)' }}>
                    {parentUser?.email}
                  </p>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Phone Number</span>
                  <p style={{ margin: '0.15rem 0 0', fontWeight: 600, color: 'var(--text-dark-primary)' }}>
                    {parentUser?.phone}
                  </p>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Account Status</span>
                  <p style={{ margin: '0.15rem 0 0', fontWeight: 800, color: '#065F46' }}>
                    Active & Verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. UPI QR PAYMENT CHECKOUT MODAL */}
      {isPayModalOpen && feeData && (
        <div
          className="cbts-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 25, 44, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="cbts-admin-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  Pay Child Bus Fee
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-dark-muted)' }}>
                  {studentData?.name} ({studentData?.registerNumber}) • Bus {feeData.bus?.busNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dark-secondary)',
                }}
              >
                ✕
              </button>
            </div>

            {paySuccessMessage ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>
                  ✓
                </div>
                <h3 style={{ margin: 0, color: '#065F46', fontSize: '1.3rem', fontWeight: 800 }}>Payment Confirmed!</h3>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-dark-secondary)', fontSize: '0.9rem' }}>
                  {paySuccessMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment}>
                {payModalError && (
                  <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                    </svg>
                    <span>{payModalError}</span>
                  </div>
                )}

                {/* Amount Highlight */}
                <div style={{ background: 'rgba(11, 61, 145, 0.04)', padding: '1rem', borderRadius: '14px', textAlign: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Payable Amount ({feeData.fee?.academicYear})
                  </span>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#065F46' }}>
                    {formatCurrency(feeData.fee?.amount)}
                  </p>
                </div>

                {/* Active Admin UPI QR Code */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem', padding: '1rem', background: '#F8FAFC', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {feeData.upiQr?.isConfigured && feeData.upiQr.upiQrImage ? (
                    <div>
                      <img
                        src={feeData.upiQr.upiQrImage}
                        alt="College Bus Transport UPI Payment QR"
                        style={{
                          width: '200px',
                          height: '200px',
                          objectFit: 'contain',
                          borderRadius: '12px',
                          border: '2px solid #E2E8F0',
                          background: '#ffffff',
                          padding: '0.5rem',
                          margin: '0 auto',
                          display: 'block',
                        }}
                      />
                      <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {feeData.upiQr.upiName || 'College Bus Transport Fee'}
                      </p>
                      {feeData.upiQr.upiId && (
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-dark-secondary)', fontWeight: 600 }}>
                          UPI ID: {feeData.upiQr.upiId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem 1rem' }}>
                      <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.88rem' }}>
                        Scan using Google Pay, PhonePe, Paytm, or any UPI App to complete payment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Instruction */}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dark-muted)', marginBottom: '1rem', textAlign: 'center', lineHeight: 1.4 }}>
                  Scan the QR code above with any UPI app, pay <strong>{formatCurrency(feeData.fee?.amount)}</strong>, and enter your 12-digit UPI Transaction ID / UTR below.
                </p>

                {/* UTR Input */}
                <div className="cbts-form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="cbts-form-label" htmlFor="utrInput">
                    UPI Transaction ID / UTR <span className="cbts-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="utrInput"
                    value={transactionIdInput}
                    onChange={(e) => setTransactionIdInput(e.target.value)}
                    placeholder="e.g. 423984719284"
                    className="cbts-form-input"
                    style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700 }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="cbts-btn cbts-btn-secondary"
                    onClick={() => setIsPayModalOpen(false)}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 600 }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="cbts-btn cbts-btn-primary"
                    disabled={paySubmitting}
                    style={{ flex: 2, padding: '0.75rem', borderRadius: '12px', fontWeight: 800 }}
                  >
                    {paySubmitting ? 'Confirming Payment...' : 'Payment Completed ✓'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ParentDashboard;
