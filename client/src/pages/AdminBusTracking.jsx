import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import LiveBusMap from '../components/LiveBusMap';
import '../styles/landing.css';
import '../styles/admin.css';

/**
 * College Admin Live Bus Tracking Page
 * Displays fleet live map, project bus tracking, telemetry, and demo simulation controls
 */
const AdminBusTracking = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User and College Context
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userCollegeId = currentUser.collegeId?._id || currentUser.collegeId;

  // Guard: Must be College Admin
  useEffect(() => {
    if (!currentUser.role || currentUser.role === 'super_admin') {
      navigate(currentUser.role === 'super_admin' ? '/super-admin' : '/login/admin');
    }
  }, [currentUser, navigate]);

  // Load college's buses
  useEffect(() => {
    const loadBuses = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get('http://localhost:5000/api/bus/all', {
          headers: {
            'x-user-id': currentUser._id || '',
            'x-college-id': userCollegeId || '',
          },
        });

        if (res.data?.success && res.data.buses) {
          setBuses(res.data.buses);
          // Default select the first available bus from the college fleet
          const defaultBus = res.data.buses[0];
          setSelectedBus(defaultBus || null);
        }
      } catch (err) {
        console.error('Error fetching buses for tracking:', err);
        setError(err.response?.data?.message || 'Failed to load college buses.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser.role !== 'super_admin') {
      loadBuses();
    }
  }, [userCollegeId, currentUser._id, currentUser.role]);

  return (
    <div className="cbts-admin-wrapper">
      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-admin-content" style={{ maxWidth: '1240px' }}>
        {/* Navigation & Header */}
        <header className="cbts-admin-header" style={{ marginBottom: '2rem' }}>
          <div className="cbts-admin-title-group">
            <h1 className="cbts-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🛰️</span> Fleet Live Tracking
            </h1>
            <p className="cbts-admin-subtitle">
              Monitor real-time GPS telemetry, route waypoints, and vehicle velocity
              {currentUser.collegeId?.name ? ` for ${currentUser.collegeId.name}` : ''}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button
              className="cbts-admin-btn-exit"
              onClick={() => navigate('/admin')}
              style={{ background: '#ffffff', color: 'var(--primary-navy)', borderColor: 'rgba(11, 61, 145, 0.2)' }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Fleet Selector Tabs */}
        {buses.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {buses.map((bus) => {
              const isSelected = selectedBus?._id === bus._id;
              return (
                <button
                  key={bus._id}
                  type="button"
                  onClick={() => setSelectedBus(bus)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '2px solid var(--primary-navy)' : '1px solid #E2E8F0',
                    background: isSelected ? 'var(--primary-navy)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--text-dark-primary)',
                    boxShadow: isSelected ? '0 4px 12px rgba(11, 61, 145, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🚌</span>
                  <span>Bus {bus.busNumber}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Live Map Display Area */}
        {loading ? (
          <div className="cbts-admin-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="cbts-loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-dark-muted)', margin: 0, fontWeight: 600 }}>
              Connecting to live telemetry feed...
            </p>
          </div>
        ) : selectedBus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <LiveBusMap
              busId={selectedBus._id}
              initialBusNumber={selectedBus.busNumber}
              showControls={true}
              height="580px"
            />

            {/* Hardware Architecture Preparation Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.4rem 1.8rem',
                border: '1px solid rgba(11, 61, 145, 0.12)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.4rem', color: 'var(--primary-navy)', fontSize: '0.98rem', fontWeight: 800 }}>
                  🔌 Future Hardware Integration Details
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-dark-muted)', lineHeight: 1.5 }}>
                  The backend GPS ingestion API is live and listening on <code>POST /api/bus/tracking/gps</code>. When your physical <strong>ESP32 + NEO-6M GPS + SIM7600 4G</strong> device is connected, it transmits telemetry directly to MongoDB.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.4rem', color: '#059669', fontSize: '0.98rem', fontWeight: 800 }}>
                  ⚡ Seamless Mode Switching
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-dark-muted)', lineHeight: 1.5 }}>
                  Upon receiving the first physical GPS packet, the badge automatically toggles from <strong>DEMO / SIMULATED</strong> to <strong>REAL HARDWARE GPS</strong> without requiring any code modifications or frontend recompilations.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="cbts-admin-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-navy)' }}>No Bus Selected</h3>
            <p style={{ color: 'var(--text-dark-muted)' }}>Select a bus from the fleet bar above to view its live tracking map.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminBusTracking;
