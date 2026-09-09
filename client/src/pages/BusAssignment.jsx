import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/admin.css';

/**
 * Admin Bus Assignment Page - Allocates approved students to active transport routes
 */
const BusAssignment = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stores the selected bus ID for each student row: { [studentId]: busId }
  const [selectedBuses, setSelectedBuses] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  // Fetch unassigned students and active buses
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userCollegeId = currentUser.collegeId?._id || currentUser.collegeId;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = userCollegeId ? { collegeId: userCollegeId } : {};

      const headers = {
        'x-user-id': currentUser._id || '',
        'x-college-id': userCollegeId || '',
      };

      // Fetch approved students without assignments
      const studentsRes = await axios.get('http://localhost:5000/api/admin/unassigned-students', { params, headers });
      if (studentsRes.data && studentsRes.data.students) {
        setStudents(studentsRes.data.students);
      }

      // Fetch all fleet buses
      const busesRes = await axios.get('http://localhost:5000/api/bus/all', { params, headers });
      if (busesRes.data && busesRes.data.buses) {
        // Filter only Active buses
        const activeBuses = busesRes.data.buses.filter(bus => bus.status === 'Active');
        setBuses(activeBuses);
      }
    } catch (err) {
      console.error('Error fetching assignment data:', err);
      setError(err.response?.data?.message || 'Failed to load details from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dropdown selection change handler
  const handleSelectChange = (studentId, busId) => {
    setSelectedBuses((prev) => ({
      ...prev,
      [studentId]: busId,
    }));
  };

  // Submit bus assignment
  const handleAssign = async (studentId) => {
    const busId = selectedBuses[studentId];
    if (!busId) {
      alert("Please select a bus from the dropdown first.");
      return;
    }

    // Verify seats
    const targetBus = buses.find(b => b._id === busId);
    if (!targetBus || targetBus.availableSeats <= 0) {
      alert("This bus has no available seats left.");
      return;
    }

    try {
      setAssigningId(studentId);
      setError('');
      setSuccess('');

      const response = await axios.post(
        'http://localhost:5000/api/admin/assign-bus',
        { studentId, busId },
        {
          headers: {
            'x-user-id': currentUser._id || '',
            'x-college-id': userCollegeId || '',
          },
        }
      );

      if (response.data && response.data.success) {
        setSuccess(`Bus assigned successfully to student.`);
        
        // Remove selection state
        setSelectedBuses((prev) => {
          const updated = { ...prev };
          delete updated[studentId];
          return updated;
        });

        // Refresh data automatically
        await fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error assigning bus:', err);
      setError(err.response?.data?.message || 'Failed to assign bus.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleExit = () => {
    navigate('/admin'); // Return to Dashboard
  };

  return (
    <div className="cbts-admin-wrapper">
      {/* Background blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-admin-content" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <header className="cbts-admin-header">
          <div className="cbts-admin-title-group">
            <h1 className="cbts-admin-title">Bus Assignment</h1>
            <p className="cbts-admin-subtitle">Assign approved students to active fleet buses.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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

            <button className="cbts-admin-btn-exit" onClick={handleExit}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Exit to Dashboard
            </button>
          </div>
        </header>

        {/* Global alerts */}
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

        {/* Table Content Panel */}
        <div className="cbts-admin-card">
          <h2 className="cbts-register-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary-navy)' }}>
            Unassigned Student List
          </h2>

          {loading && !assigningId ? (
            <div className="cbts-loader-container">
              <div className="cbts-loader-spinner"></div>
              <p className="cbts-loader-text">Loading unassigned records...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="cbts-empty-state">
              <div className="cbts-empty-icon-container">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="cbts-empty-title">All Students Assigned</h2>
              <p className="cbts-empty-subtitle">There are no approved students waiting for route assignments.</p>
            </div>
          ) : (
            <div className="cbts-table-container">
              <table className="cbts-admin-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Register Number</th>
                    <th>Department</th>
                    <th>Current Status</th>
                    <th>Select Active Bus Route</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-dark-primary)' }}>{student.name}</td>
                      <td>{student.registerNumber}</td>
                      <td>{student.department}</td>
                      <td>
                        <span 
                          className="cbts-badge-pending" 
                          style={{ 
                            background: 'rgba(245, 158, 11, 0.12)', 
                            color: '#B78103' 
                          }}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="cbts-form-select"
                          style={{ 
                            padding: '0.5rem', 
                            fontSize: '0.85rem', 
                            borderRadius: '8px', 
                            width: '100%', 
                            maxWidth: '320px',
                            border: '1px solid rgba(11, 61, 145, 0.15)',
                            background: 'rgba(255, 255, 255, 0.7)'
                          }}
                          value={selectedBuses[student._id] || ''}
                          onChange={(e) => handleSelectChange(student._id, e.target.value)}
                        >
                          <option value="">-- Choose Bus Route --</option>
                          {buses.map((bus) => (
                            <option 
                              key={bus._id} 
                              value={bus._id} 
                              disabled={bus.availableSeats <= 0}
                            >
                              {bus.busNumber} - {bus.route} ({bus.availableSeats} / {bus.totalSeats} seats)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="cbts-btn cbts-btn-primary"
                          style={{ 
                            padding: '0.45rem 1rem', 
                            fontSize: '0.85rem', 
                            borderRadius: '8px',
                            margin: 0,
                            whiteSpace: 'nowrap'
                          }}
                          onClick={() => handleAssign(student._id)}
                          disabled={assigningId === student._id || !selectedBuses[student._id]}
                        >
                          {assigningId === student._id ? 'Assigning...' : 'Assign Bus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BusAssignment;
