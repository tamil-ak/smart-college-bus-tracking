import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/admin.css';

/**
 * Admin Dashboard - Pending Registrations Approval & Multi-College System
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User and College Context State
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userCollegeId = currentUser.collegeId?._id || currentUser.collegeId;

  // Guard: Super Admin must use Super Admin Portal
  useEffect(() => {
    if (currentUser.role === 'super_admin') {
      navigate('/super-admin');
    }
  }, [currentUser, navigate]);

  // Fetch pending student registrations for this College Admin's college
  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('http://localhost:5000/api/admin/pending', {
        params: { collegeId: userCollegeId },
        headers: {
          'x-user-id': currentUser._id || '',
          'x-college-id': userCollegeId || '',
        },
      });
      if (response.data && response.data.students) {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Error fetching pending students:', err);
      setError(err.response?.data?.message || 'Failed to fetch pending students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.role !== 'super_admin') {
      fetchPendingStudents();
    }
  }, [userCollegeId]);

  // Handle student approval
  const handleApprove = async (studentId) => {
    try {
      setError('');
      setSuccess('');
      const response = await axios.put(
        `http://localhost:5000/api/admin/approve/${studentId}`,
        {},
        {
          headers: {
            'x-user-id': currentUser._id || '',
            'x-college-id': userCollegeId || '',
          },
        }
      );

      if (response.data && response.data.success) {
        setSuccess('Student registration approved successfully.');
        await fetchPendingStudents();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error approving student:', err);
      setError(err.response?.data?.message || 'Failed to approve student.');
    }
  };

  // Handle student rejection
  const handleReject = async (studentId) => {
    try {
      setError('');
      setSuccess('');
      const response = await axios.put(
        `http://localhost:5000/api/admin/reject/${studentId}`,
        {},
        {
          headers: {
            'x-user-id': currentUser._id || '',
            'x-college-id': userCollegeId || '',
          },
        }
      );

      if (response.data && response.data.success) {
        setSuccess('Student registration rejected successfully.');
        await fetchPendingStudents();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error rejecting student:', err);
      setError(err.response?.data?.message || 'Failed to reject student.');
    }
  };

  const handleExit = () => {
    localStorage.removeItem('user');
    navigate('/login/admin');
  };

  return (
    <div className="cbts-admin-wrapper">
      {/* Background blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-admin-content">
        {/* Header Section */}
        <header className="cbts-admin-header">
          <div className="cbts-admin-title-group">
            <h1 className="cbts-admin-title">
              College Admin Dashboard
            </h1>
            <p className="cbts-admin-subtitle">
              Manage student access approvals, bus routes, fleet details, and fee schedules
              {currentUser.collegeId?.name ? ` for ${currentUser.collegeId.name}` : ''}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="cbts-admin-stats">
              <span className="cbts-stats-number">{students.length}</span>
              <span className="cbts-stats-label">Pending Reviews</span>
            </div>

            <button 
              className="cbts-admin-btn-exit" 
              onClick={() => navigate('/admin/buses')}
              style={{ background: 'var(--primary-navy)', color: '#ffffff', borderColor: 'var(--primary-navy)' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h4M6 12h12M6 16h8" />
              </svg>
              Manage Buses
            </button>

            <button 
              className="cbts-admin-btn-exit" 
              onClick={() => navigate('/admin/bus-assignment')}
              style={{ background: 'var(--primary-navy)', color: '#ffffff', borderColor: 'var(--primary-navy)' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              Bus Assignment
            </button>

            <button 
              className="cbts-admin-btn-exit" 
              onClick={() => navigate('/admin/bus-fees')}
              style={{ background: 'var(--primary-navy)', color: '#ffffff', borderColor: 'var(--primary-navy)' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="6" y1="15" x2="10" y2="15" />
              </svg>
              Bus Fees
            </button>

            <button 
              className="cbts-admin-btn-exit" 
              onClick={() => navigate('/admin/track-bus')}
              style={{ background: '#10B981', color: '#ffffff', borderColor: '#10B981' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 12 12 16 16 12 12 8" />
              </svg>
              Track Buses
            </button>
            
            <button className="cbts-admin-btn-exit" onClick={handleExit}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Success / Error Banners */}
        {error && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '2rem' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '2rem', borderColor: '#10B981', background: 'rgba(16, 185, 129, 0.08)', color: '#065F46' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="cbts-admin-card">
          {loading ? (
            <div className="cbts-loader-container">
              <div className="cbts-loader-spinner"></div>
              <p className="cbts-loader-text">Loading registration records...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="cbts-empty-state">
              <div className="cbts-empty-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="cbts-empty-title">No Pending Students</h2>
              <p className="cbts-empty-subtitle">There are no pending student registration requests at the moment.</p>
            </div>
          ) : (
            <div className="cbts-table-container">
              <table className="cbts-admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Register Number</th>
                    <th>Dept & Class</th>
                    <th>Email Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-dark-primary)' }}>
                        {student.name}
                        {student.collegeId?.name && (
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                            🏛️ {student.collegeId.name} ({student.collegeId.code})
                          </div>
                        )}
                      </td>
                      <td>{student.registerNumber}</td>
                      <td>
                        <span className="cbts-dept-badge">
                          {student.department} - {student.year} Yr ({student.section})
                        </span>
                      </td>
                      <td>{student.email}</td>
                      <td>
                        <span className="cbts-badge-pending">{student.status}</span>
                      </td>
                      <td>
                        <div className="cbts-actions-cell">
                          <button
                            className="cbts-btn-action cbts-btn-approve"
                            onClick={() => handleApprove(student._id)}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Approve
                          </button>
                          
                          <button
                            className="cbts-btn-action cbts-btn-reject"
                            onClick={() => handleReject(student._id)}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Super Admin: Create College Modal Overlay */}
      <Footer />
    </div>
  );
};

export default AdminDashboard;
