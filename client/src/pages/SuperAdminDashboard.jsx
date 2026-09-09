import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/admin.css';

/**
 * Professional Super Admin Dashboard for Multi-College CBTS Platform
 */
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'colleges' | 'admins' | 'profile'

  // Data States
  const [stats, setStats] = useState({
    totalColleges: 0,
    pendingAdminRequests: 0,
    totalStudents: 0,
    totalBuses: 0,
    totalRevenue: 0,
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [approvedAdmins, setApprovedAdmins] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Super Admin Profile State
  const [superAdmin, setSuperAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return null;
    }
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const profileFileInputRef = React.useRef(null);

  // Add College Modal State
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [newCollege, setNewCollege] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  // Load Super Admin Profile from Backend
  const loadSuperAdminProfile = async (userId) => {
    if (!userId) return;
    try {
      const res = await axios.get('http://localhost:5000/api/auth/super-admin/profile', {
        headers: { 'x-user-id': userId }
      });
      if (res.data?.success && res.data.user) {
        setSuperAdmin(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('Failed to refresh Super Admin profile:', err.message);
    }
  };

  // Verify Super Admin access
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'super_admin') {
      navigate('/login/admin');
    } else {
      setSuperAdmin(user);
      loadSuperAdminProfile(user._id);
    }
  }, [navigate]);

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    if (superAdmin) {
      setEditName(superAdmin.name || '');
      setEditPhone(superAdmin.phone || '');
    }
    setPreviewImage(null);
    setProfileError('');
    setProfileSuccess('');
    setProfileModalOpen(true);
  };

  // Profile Photo Selection with Client Validation
  const handleProfileFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setProfileError('');
    setProfileSuccess('');

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setProfileError('Invalid image format. Please select a JPG, JPEG, PNG, or WEBP photo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('File size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Save Super Admin Profile (Name, Phone, and/or Profile Image)
  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!superAdmin?._id) return;

    try {
      setUploadingProfile(true);
      setProfileError('');
      setProfileSuccess('');

      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
      };

      if (previewImage) {
        payload.image = previewImage;
      }

      const res = await axios.put(
        'http://localhost:5000/api/auth/super-admin/profile',
        payload,
        {
          headers: {
            'x-user-id': superAdmin._id,
          },
        }
      );

      if (res.data && res.data.success) {
        const updated = res.data.user;
        setSuperAdmin(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        setProfileSuccess('Super Admin profile updated successfully!');
        setTimeout(() => {
          setProfileModalOpen(false);
          setPreviewImage(null);
          setProfileSuccess('');
        }, 1200);
      }
    } catch (err) {
      console.error('Error saving Super Admin profile:', err);
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Load Super Admin Dashboard Data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, reqRes, colRes, adminRes] = await Promise.all([
        axios.get('http://localhost:5000/api/colleges/stats'),
        axios.get('http://localhost:5000/api/colleges/pending-admins'),
        axios.get('http://localhost:5000/api/colleges/all'),
        axios.get('http://localhost:5000/api/colleges/approved-admins'),
      ]);

      if (statsRes.data?.stats) setStats(statsRes.data.stats);
      if (reqRes.data?.requests) setPendingRequests(reqRes.data.requests);
      if (colRes.data?.colleges) setColleges(colRes.data.colleges);
      if (adminRes.data?.admins) setApprovedAdmins(adminRes.data.admins);
    } catch (err) {
      console.error('Error loading super admin dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Approve Admin Request
  const handleApproveAdmin = async (adminId) => {
    try {
      setError('');
      setSuccess('');
      const res = await axios.put(`http://localhost:5000/api/colleges/approve-admin/${adminId}`);
      if (res.data && res.data.success) {
        setSuccess('College Admin request approved successfully!');
        await loadDashboardData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request.');
    }
  };

  // Reject Admin Request
  const handleRejectAdmin = async (adminId) => {
    try {
      setError('');
      setSuccess('');
      const res = await axios.put(`http://localhost:5000/api/colleges/reject-admin/${adminId}`);
      if (res.data && res.data.success) {
        setSuccess('College Admin request rejected.');
        await loadDashboardData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request.');
    }
  };

  // Create College
  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await axios.post('http://localhost:5000/api/colleges/create', newCollege);
      if (res.data && res.data.success) {
        setSuccess(`College "${newCollege.name}" created successfully!`);
        setShowCollegeModal(false);
        setNewCollege({
          name: '',
          code: '',
          email: '',
          phone: '',
          address: '',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
        });
        await loadDashboardData();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create college.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login/admin');
  };

  return (
    <div className="cbts-admin-wrapper">
      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-admin-content">
        {/* Navigation & Header */}
        <header className="cbts-admin-header">
          <div className="cbts-admin-title-group">
            <h1 className="cbts-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ CBTS Super Admin Platform
            </h1>
            <p className="cbts-admin-subtitle">
              Multi-Tenant Control Center – Manage colleges, approve admin access, and oversee transport statistics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Super Admin Top-Right Profile Pill / Avatar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#ffffff',
                padding: '0.35rem 0.85rem 0.35rem 0.45rem',
                borderRadius: '50px',
                border: '1px solid rgba(11, 61, 145, 0.12)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {/* Circular Avatar with Camera Badge */}
              <div
                style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                onClick={handleOpenEditProfile}
                title="Click to edit Super Admin profile"
              >
                {superAdmin?.profileImage ? (
                  <img
                    src={superAdmin.profileImage.startsWith('http') ? superAdmin.profileImage : `http://localhost:5000${superAdmin.profileImage}`}
                    alt={superAdmin.name || 'Super Admin'}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #3B82F6',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0B3D91 0%, #1E3A8A 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {(superAdmin?.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Camera / Edit Icon Badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    background: '#3B82F6',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>

              {/* Admin Info */}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary-navy)' }}>
                  {superAdmin?.name || 'Super Admin'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700 }}>
                  👑 Super Admin
                </span>
              </div>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={handleOpenEditProfile}
                title="Edit Profile"
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#2563EB',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
              >
                ✏️ Edit
              </button>
            </div>

            <button className="cbts-admin-btn-exit" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
          <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(11, 61, 145, 0.1)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Colleges</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-navy)', marginTop: '0.3rem' }}>{stats.totalColleges || colleges.length}</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ fontSize: '0.85rem', color: '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>Pending Admin Requests</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D97706', marginTop: '0.3rem' }}>{stats.pendingAdminRequests || pendingRequests.length}</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1.4rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Approved College Admins</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', marginTop: '0.3rem' }}>{stats.totalApprovedAdmins || approvedAdmins.length}</div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem', borderColor: '#10B981', background: 'rgba(16, 185, 129, 0.08)', color: '#065F46' }}>
            <span>{success}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', borderBottom: '2px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'requests' ? 'var(--primary-navy)' : 'transparent',
              color: activeTab === 'requests' ? '#ffffff' : 'var(--text-dark-secondary)',
            }}
          >
            Pending Admin Requests ({pendingRequests.length})
          </button>
          
          <button
            onClick={() => setActiveTab('colleges')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'colleges' ? 'var(--primary-navy)' : 'transparent',
              color: activeTab === 'colleges' ? '#ffffff' : 'var(--text-dark-secondary)',
            }}
          >
            Colleges List ({colleges.length})
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'admins' ? 'var(--primary-navy)' : 'transparent',
              color: activeTab === 'admins' ? '#ffffff' : 'var(--text-dark-secondary)',
            }}
          >
            Approved College Admins ({approvedAdmins.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'profile' ? 'var(--primary-navy)' : 'transparent',
              color: activeTab === 'profile' ? '#ffffff' : 'var(--text-dark-secondary)',
            }}
          >
            👤 My Profile
          </button>
        </div>

        {/* Tab 1: Pending Admin Requests */}
        {activeTab === 'requests' && (
          <div className="cbts-admin-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
              Pending College Admin Registrations
            </h2>
            {loading ? (
              <div className="cbts-loader-container">
                <div className="cbts-loader-spinner"></div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="cbts-empty-state">
                <h3 className="cbts-empty-title">No Pending Requests</h3>
                <p className="cbts-empty-subtitle">All College Admin registration requests have been processed.</p>
              </div>
            ) : (
              <div className="cbts-table-container">
                <table className="cbts-admin-table">
                  <thead>
                    <tr>
                      <th>Admin Name</th>
                      <th>Email Address</th>
                      <th>Target College</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((req) => (
                      <tr key={req._id}>
                        <td style={{ fontWeight: 700 }}>{req.name}</td>
                        <td>{req.email}</td>
                        <td>
                          {req.collegeId ? (
                            <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>
                              🏛️ {req.collegeId.name} ({req.collegeId.code})
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className="cbts-badge-pending" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#D97706' }}>
                            {req.status}
                          </span>
                        </td>
                        <td>
                          <div className="cbts-actions-cell">
                            <button
                              className="cbts-btn-action cbts-btn-approve"
                              onClick={() => handleApproveAdmin(req._id)}
                            >
                              Approve
                            </button>
                            <button
                              className="cbts-btn-action cbts-btn-reject"
                              onClick={() => handleRejectAdmin(req._id)}
                            >
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
        )}

        {/* Tab 2: Colleges Management */}
        {activeTab === 'colleges' && (
          <div className="cbts-admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', margin: 0 }}>
                Colleges Directory
              </h2>
              <button
                className="cbts-btn cbts-btn-primary"
                onClick={() => setShowCollegeModal(true)}
                style={{ background: '#10B981', borderColor: '#10B981' }}
              >
                + Add New College
              </button>
            </div>

            <div className="cbts-table-container">
              <table className="cbts-admin-table">
                <thead>
                  <tr>
                    <th>College Name</th>
                    <th>Code</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {colleges.map((c) => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>{c.name}</td>
                      <td><span className="cbts-dept-badge">{c.code}</span></td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>
                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: c.status === 'Active' ? '#ECFDF5' : '#FEF2F2', color: c.status === 'Active' ? '#065F46' : '#991B1B' }}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Approved College Admins */}
        {activeTab === 'admins' && (
          <div className="cbts-admin-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
              Approved College Administrators
            </h2>
            <div className="cbts-table-container">
              <table className="cbts-admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned College</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedAdmins.map((adm) => (
                    <tr key={adm._id}>
                      <td style={{ fontWeight: 700 }}>{adm.name}</td>
                      <td>{adm.email}</td>
                      <td>
                        {adm.collegeId ? (
                          <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>
                            🏛️ {adm.collegeId.name} ({adm.collegeId.code})
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>Super Admin / Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span style={{ background: '#ECFDF5', color: '#065F46', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                          Approved ✓
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Super Admin Dedicated Profile */}
        {activeTab === 'profile' && (
          <div className="cbts-admin-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)', margin: 0 }}>
                  👑 Super Admin Profile
                </h2>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: 'var(--text-dark-muted)' }}>
                  Manage your personal details, credentials, and profile picture.
                </p>
              </div>

              <button
                type="button"
                className="cbts-btn cbts-btn-primary"
                onClick={handleOpenEditProfile}
                style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ✏️ Edit Profile
              </button>
            </div>

            {/* Profile Overview Card */}
            <div
              style={{
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                padding: '1.8rem',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(11, 61, 145, 0.1)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              {/* Circular Avatar with Camera Badge */}
              <div
                style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                onClick={handleOpenEditProfile}
                title="Click to change profile picture"
              >
                {superAdmin?.profileImage ? (
                  <img
                    src={superAdmin.profileImage.startsWith('http') ? superAdmin.profileImage : `http://localhost:5000${superAdmin.profileImage}`}
                    alt={superAdmin.name || 'Super Admin'}
                    style={{
                      width: '108px',
                      height: '108px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid #3B82F6',
                      boxShadow: '0 6px 20px rgba(59, 130, 246, 0.25)',
                      display: 'block',
                      background: '#ffffff',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '108px',
                      height: '108px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0B3D91 0%, #1E3A8A 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      border: '4px solid #ffffff',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                    }}
                  >
                    {(superAdmin?.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Camera Icon Badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    background: '#3B82F6',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </div>

              {/* Basic Details */}
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    {superAdmin?.name || 'Super Administrator'}
                  </h3>
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#92400E',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: '1px solid #FCD34D',
                    }}
                  >
                    👑 Super Admin
                  </span>
                </div>
                <p style={{ margin: '0 0 0.8rem', color: 'var(--text-dark-muted)', fontSize: '0.92rem' }}>
                  {superAdmin?.email || 'N/A'}
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dark-muted)', display: 'block' }}>Account Status</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>Approved & Active ✓</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dark-muted)', display: 'block' }}>Platform Scope</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>Multi-College Root Administrator</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Properties Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#F8FAFC', padding: '1.1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Full Name
                </span>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)', fontSize: '0.95rem' }}>
                  {superAdmin?.name || 'Not provided'}
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '1.1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Email Address
                </span>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)', fontSize: '0.95rem' }}>
                  {superAdmin?.email || 'Not provided'}
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '1.1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Phone Number
                </span>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)', fontSize: '0.95rem' }}>
                  {superAdmin?.phone || 'Not provided'}
                </p>
              </div>

              <div style={{ background: '#F8FAFC', padding: '1.1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  System Role
                </span>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: '#D97706', fontSize: '0.95rem' }}>
                  Super Admin (role: super_admin)
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add College Modal */}
      {showCollegeModal && (
        <div className="cbts-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="cbts-modal-card" style={{ maxWidth: '560px', width: '90%', textAlign: 'left' }}>
            <h2 className="cbts-modal-title" style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--primary-navy)' }}>
              🏛️ Add New College
            </h2>
            <p className="cbts-modal-subtitle" style={{ marginBottom: '1.2rem', fontSize: '0.9rem' }}>
              Enter college details and provision an initial College Admin.
            </p>

            <form onSubmit={handleCreateCollege}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                <div>
                  <label className="cbts-form-label">College Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRM Institute"
                    className="cbts-form-input"
                    value={newCollege.name}
                    onChange={(e) => setNewCollege({ ...newCollege, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="cbts-form-label">College Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRM"
                    className="cbts-form-input"
                    value={newCollege.code}
                    onChange={(e) => setNewCollege({ ...newCollege, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="cbts-form-label">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@srm.edu"
                    className="cbts-form-input"
                    value={newCollege.email}
                    onChange={(e) => setNewCollege({ ...newCollege, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="cbts-form-label">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    className="cbts-form-input"
                    value={newCollege.phone}
                    onChange={(e) => setNewCollege({ ...newCollege, phone: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="cbts-form-label">Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Campus Location Address"
                    className="cbts-form-input"
                    value={newCollege.address}
                    onChange={(e) => setNewCollege({ ...newCollege, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cbts-btn cbts-btn-secondary"
                  onClick={() => setShowCollegeModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cbts-btn cbts-btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }}>
                  Create College
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Edit Profile Modal */}
      {profileModalOpen && (
        <div className="cbts-modal-overlay" style={{ zIndex: 1150 }}>
          <div className="cbts-modal-card" style={{ maxWidth: '520px', width: '92%', textAlign: 'left', padding: '2rem' }}>
            <h2 className="cbts-modal-title" style={{ fontSize: '1.35rem', marginBottom: '0.3rem', color: 'var(--primary-navy)' }}>
              📷 Edit Super Admin Profile
            </h2>
            <p className="cbts-modal-subtitle" style={{ fontSize: '0.88rem', color: 'var(--text-dark-muted)', marginBottom: '1.2rem' }}>
              Update your photo and personal contact information.
            </p>

            {/* Error & Success Alert Banners */}
            {profileError && (
              <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', fontSize: '0.85rem', borderColor: '#10B981', background: 'rgba(16, 185, 129, 0.08)', color: '#065F46' }}>
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {/* Photo Preview & Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    border: '3px solid #3B82F6',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                    overflow: 'hidden',
                    background: '#F3F4F6',
                    marginBottom: '0.8rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => profileFileInputRef.current && profileFileInputRef.current.click()}
                  title="Click to select image"
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : superAdmin?.profileImage ? (
                    <img
                      src={superAdmin.profileImage.startsWith('http') ? superAdmin.profileImage : `http://localhost:5000${superAdmin.profileImage}`}
                      alt="Current Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#1E3A8A' }}>
                      {(superAdmin?.name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.5)',
                      color: '#ffffff',
                      textAlign: 'center',
                      padding: '2px 0',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                    }}
                  >
                    Change
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={profileFileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleProfileFileSelect}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  className="cbts-btn cbts-btn-secondary"
                  onClick={() => profileFileInputRef.current && profileFileInputRef.current.click()}
                  disabled={uploadingProfile}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                >
                  📁 Select Photo (JPG, PNG, max 5MB)
                </button>
              </div>

              {/* Profile Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="cbts-form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="cbts-form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={uploadingProfile}
                  />
                </div>

                <div>
                  <label className="cbts-form-label">Phone Number</label>
                  <input
                    type="text"
                    className="cbts-form-input"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={uploadingProfile}
                  />
                </div>

                <div>
                  <label className="cbts-form-label">Email Address (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    className="cbts-form-input"
                    value={superAdmin?.email || ''}
                    style={{ background: '#F3F4F6', cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label className="cbts-form-label">Role (Read-only)</label>
                  <input
                    type="text"
                    disabled
                    className="cbts-form-input"
                    value="Super Admin (Root Access)"
                    style={{ background: '#F3F4F6', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cbts-btn cbts-btn-secondary"
                  onClick={() => {
                    setProfileModalOpen(false);
                    setPreviewImage(null);
                    setProfileError('');
                    setProfileSuccess('');
                  }}
                  disabled={uploadingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cbts-btn cbts-btn-primary"
                  disabled={uploadingProfile}
                  style={{ background: '#10B981', borderColor: '#10B981' }}
                >
                  {uploadingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SuperAdminDashboard;
