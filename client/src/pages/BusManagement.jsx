import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/register.css';
import '../styles/admin.css';

/**
 * Admin Bus Management Page for CBTS - Redesigned Dashboard Layout
 */
const BusManagement = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBusId, setEditingBusId] = useState(null);

  // Bus QR Modal State
  const [qrModalData, setQrModalData] = useState(null);
  const [qrLoadingId, setQrLoadingId] = useState(null);

  // Form State
  const [formFields, setFormFields] = useState({
    busNumber: '',
    driverName: '',
    driverPhone: '',
    route: '',
    totalSeats: '',
    availableSeats: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all buses
  const fetchBuses = async () => {
    try {
      setLoading(true);
      setGlobalError('');
      const response = await axios.get('http://localhost:5000/api/bus/all');
      if (response.data && response.data.buses) {
        setBuses(response.data.buses);
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
      setGlobalError(err.response?.data?.message || 'Failed to fetch fleet list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
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

    if (!formFields.busNumber.trim()) {
      tempErrors.busNumber = 'Bus Number is required';
      isValid = false;
    }
    if (!formFields.driverName.trim()) {
      tempErrors.driverName = 'Driver Name is required';
      isValid = false;
    }
    if (!formFields.driverPhone.trim()) {
      tempErrors.driverPhone = 'Driver Phone is required';
      isValid = false;
    }
    if (!formFields.route.trim()) {
      tempErrors.route = 'Route is required';
      isValid = false;
    }
    if (!formFields.totalSeats || Number(formFields.totalSeats) <= 0) {
      tempErrors.totalSeats = 'Total Seats must be a positive number';
      isValid = false;
    }

    if (editingBusId) {
      if (formFields.availableSeats === undefined || formFields.availableSeats === '' || Number(formFields.availableSeats) < 0) {
        tempErrors.availableSeats = 'Available Seats must be 0 or positive';
        isValid = false;
      }
      if (Number(formFields.availableSeats) > Number(formFields.totalSeats)) {
        tempErrors.availableSeats = 'Cannot exceed total capacity';
        isValid = false;
      }
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      const payload = {
        busNumber: formFields.busNumber,
        driverName: formFields.driverName,
        driverPhone: formFields.driverPhone,
        route: formFields.route,
        totalSeats: Number(formFields.totalSeats),
        availableSeats: editingBusId ? Number(formFields.availableSeats) : Number(formFields.totalSeats),
        status: formFields.status || 'Active',
      };

      try {
        setGlobalError('');
        setSuccess('');

        if (editingBusId) {
          // Update Mode
          const response = await axios.put(`http://localhost:5000/api/bus/update/${editingBusId}`, payload);
          if (response.data && response.data.success) {
            setSuccess('Bus updated successfully.');
            setEditingBusId(null);
          }
        } else {
          // Create Mode
          const response = await axios.post('http://localhost:5000/api/bus/add', payload);
          if (response.data && response.data.success) {
            setSuccess('Bus registered successfully.');
          }
        }

        setFormFields({
          busNumber: '',
          driverName: '',
          driverPhone: '',
          route: '',
          totalSeats: '',
          availableSeats: '',
          status: 'Active',
        });
        
        await fetchBuses();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error submitting bus details:', err);
        setGlobalError(err.response?.data?.message || 'Failed to save bus details.');
      }
    }
  };

  // Select bus for editing
  const handleEditClick = (bus) => {
    setGlobalError('');
    setSuccess('');
    setEditingBusId(bus._id);
    setFormFields({
      busNumber: bus.busNumber,
      driverName: bus.driverName,
      driverPhone: bus.driverPhone,
      route: bus.route,
      totalSeats: bus.totalSeats.toString(),
      availableSeats: bus.availableSeats.toString(),
      status: bus.status,
    });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingBusId(null);
    setFormFields({
      busNumber: '',
      driverName: '',
      driverPhone: '',
      route: '',
      totalSeats: '',
      availableSeats: '',
      status: 'Active',
    });
    setErrors({});
    setGlobalError('');
  };

  // Delete a bus
  const handleDeleteClick = async (busId) => {
    if (window.confirm("Are you sure you want to delete this bus?")) {
      try {
        setGlobalError('');
        setSuccess('');
        const response = await axios.delete(`http://localhost:5000/api/bus/delete/${busId}`);
        if (response.data && response.data.success) {
          setSuccess('Bus deleted successfully.');
          if (editingBusId === busId) {
            handleCancelEdit();
          }
          await fetchBuses();
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (err) {
        console.error('Error deleting bus:', err);
        setGlobalError(err.response?.data?.message || 'Failed to delete bus.');
      }
    }
  };

  // Handle Generate Bus QR Click
  const handleOpenQrModal = async (bus) => {
    try {
      setQrLoadingId(bus._id);
      setGlobalError('');

      const response = await axios.post(`http://localhost:5000/api/bus/generate-qr/${bus._id}`);

      if (response.data && response.data.success) {
        const qrId = response.data.qrId || response.data.qrCode;
        const qrPayload = response.data.qrData || JSON.stringify({
          busId: bus._id,
          busNumber: bus.busNumber,
          qrId: qrId,
        });

        // Generate QR code DataURL from payload encoding bus's unique ID and qrId
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0B3D91',
            light: '#FFFFFF',
          },
        });

        setQrModalData({
          bus: response.data.bus || bus,
          qrId: qrId,
          qrDataUrl: qrDataUrl,
        });

        // Sync local buses state
        setBuses((prev) =>
          prev.map((b) => (b._id === bus._id ? { ...b, qrId: qrId, qrCode: qrId } : b))
        );
      }
    } catch (err) {
      console.error('Error generating bus QR:', err);
      setGlobalError(err.response?.data?.message || 'Failed to generate Bus QR.');
    } finally {
      setQrLoadingId(null);
    }
  };

  // Download QR Code as PNG
  const handleDownloadQr = () => {
    if (!qrModalData) return;
    const link = document.createElement('a');
    link.href = qrModalData.qrDataUrl;
    link.download = `CBTS-Bus-${qrModalData.bus.busNumber.replace(/\s+/g, '-')}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print QR Code
  const handlePrintQr = () => {
    if (!qrModalData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the QR code.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CBTS Bus QR - ${qrModalData.bus.busNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 2rem;
              text-align: center;
              box-sizing: border-box;
            }
            .qr-card {
              border: 3px solid #0B3D91;
              border-radius: 20px;
              padding: 2.5rem 2rem;
              max-width: 450px;
              width: 100%;
              box-sizing: border-box;
            }
            .header-title {
              font-size: 22px;
              font-weight: 800;
              color: #0B3D91;
              margin: 0 0 4px 0;
            }
            .sub-title {
              font-size: 13px;
              color: #475569;
              margin: 0 0 20px 0;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              margin-bottom: 20px;
            }
            .bus-number {
              font-size: 24px;
              font-weight: 800;
              color: #0B3D91;
              margin: 0 0 6px 0;
            }
            .route-info {
              font-size: 15px;
              font-weight: 600;
              color: #1E293B;
              margin: 0 0 10px 0;
            }
            .qr-id {
              font-family: monospace;
              font-size: 13px;
              color: #64748B;
              background: #F1F5F9;
              padding: 6px 12px;
              border-radius: 6px;
              display: inline-block;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <h1 class="header-title">COLLEGE BUS TRACKING SYSTEM</h1>
            <p class="sub-title">Official Bus Boarding Attendance QR</p>
            <img src="${qrModalData.qrDataUrl}" class="qr-img" alt="Bus QR" />
            <div class="bus-number">BUS: ${qrModalData.bus.busNumber}</div>
            <div class="route-info">Route: ${qrModalData.bus.route}</div>
            <div class="qr-id">QR ID: ${qrModalData.qrId}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExit = () => {
    navigate('/admin'); // Return to Admin Dashboard
  };

  // Stats calculation
  const totalBuses = buses.length;
  const activeBuses = buses.filter(bus => bus.status === 'Active').length;
  const totalSeatsCount = buses.reduce((acc, bus) => acc + bus.totalSeats, 0);
  const availableSeatsCount = buses.reduce((acc, bus) => acc + bus.availableSeats, 0);

  return (
    <div className="cbts-admin-wrapper">
      {/* Background blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-admin-content" style={{ maxWidth: '1400px', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <header className="cbts-admin-header" style={{ marginBottom: '2rem' }}>
          <div className="cbts-admin-title-group">
            <h1 className="cbts-admin-title" style={{ fontSize: '2rem' }}>Fleet Management</h1>
            <p className="cbts-admin-subtitle">Register and manage college transport vehicles, routes, and drivers.</p>
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

        {/* Dashboard Stats Row */}
        <div className="cbts-bus-stats-row">
          <div className="cbts-stat-card">
            <span className="cbts-stat-card-title">Total Fleet</span>
            <span className="cbts-stat-card-value">{totalBuses}</span>
          </div>
          <div className="cbts-stat-card">
            <span className="cbts-stat-card-title">Active Fleet</span>
            <span className="cbts-stat-card-value" style={{ color: '#10B981' }}>{activeBuses}</span>
          </div>
          <div className="cbts-stat-card">
            <span className="cbts-stat-card-title">Total Capacity</span>
            <span className="cbts-stat-card-value">{totalSeatsCount}</span>
          </div>
          <div className="cbts-stat-card">
            <span className="cbts-stat-card-title">Available Seats</span>
            <span className="cbts-stat-card-value" style={{ color: '#F59E0B' }}>{availableSeatsCount}</span>
          </div>
        </div>

        {/* Global Alert Banners */}
        {globalError && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{globalError}</span>
          </div>
        )}

        {success && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem', borderColor: '#10B981', background: 'rgba(16, 185, 129, 0.08)', color: '#065F46' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Two-Column Responsive Content Layout */}
        <div className="cbts-bus-dashboard-grid">

          {/* Left Panel: Add/Edit Bus Form (35% on desktop) */}
          <div className="cbts-register-card" style={{ padding: '2rem', width: '100%', margin: 0 }}>
            <div className="cbts-register-header" style={{ marginBottom: '1.5rem' }}>
              <h2 className="cbts-register-title" style={{ fontSize: '1.4rem' }}>
                {editingBusId ? 'Edit Bus' : 'Add New Bus'}
              </h2>
              <p className="cbts-register-subtitle" style={{ fontSize: '0.85rem' }}>
                {editingBusId ? 'Modify active fleet registration values.' : 'Enter transportation vehicle details.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="cbts-form-grid" style={{ gridTemplateColumns: '1fr', gap: '1.1rem' }}>
                
                {/* Bus Number */}
                <div className={`cbts-form-group ${errors.busNumber ? 'has-error' : ''}`}>
                  <label className="cbts-form-label" htmlFor="busNumber" style={{ fontSize: '0.85rem' }}>Bus Number</label>
                  <input
                    type="text"
                    id="busNumber"
                    name="busNumber"
                    className="cbts-form-input"
                    placeholder="TN-37-AZ-1234"
                    value={formFields.busNumber}
                    onChange={handleChange}
                    required
                  />
                  {errors.busNumber && <span className="cbts-error-text">{errors.busNumber}</span>}
                </div>

                {/* Driver Name */}
                <div className={`cbts-form-group ${errors.driverName ? 'has-error' : ''}`}>
                  <label className="cbts-form-label" htmlFor="driverName" style={{ fontSize: '0.85rem' }}>Driver Name</label>
                  <input
                    type="text"
                    id="driverName"
                    name="driverName"
                    className="cbts-form-input"
                    placeholder="Jack Sparrow"
                    value={formFields.driverName}
                    onChange={handleChange}
                    required
                  />
                  {errors.driverName && <span className="cbts-error-text">{errors.driverName}</span>}
                </div>

                {/* Driver Phone */}
                <div className={`cbts-form-group ${errors.driverPhone ? 'has-error' : ''}`}>
                  <label className="cbts-form-label" htmlFor="driverPhone" style={{ fontSize: '0.85rem' }}>Driver Phone</label>
                  <input
                    type="text"
                    id="driverPhone"
                    name="driverPhone"
                    className="cbts-form-input"
                    placeholder="9876543212"
                    value={formFields.driverPhone}
                    onChange={handleChange}
                    required
                  />
                  {errors.driverPhone && <span className="cbts-error-text">{errors.driverPhone}</span>}
                </div>

                {/* Route */}
                <div className={`cbts-form-group ${errors.route ? 'has-error' : ''}`}>
                  <label className="cbts-form-label" htmlFor="route" style={{ fontSize: '0.85rem' }}>Route</label>
                  <input
                    type="text"
                    id="route"
                    name="route"
                    className="cbts-form-input"
                    placeholder="Route 12 - Airport to College"
                    value={formFields.route}
                    onChange={handleChange}
                    required
                  />
                  {errors.route && <span className="cbts-error-text">{errors.route}</span>}
                </div>

                {/* Total Seats */}
                <div className={`cbts-form-group ${errors.totalSeats ? 'has-error' : ''}`}>
                  <label className="cbts-form-label" htmlFor="totalSeats" style={{ fontSize: '0.85rem' }}>Total Seats</label>
                  <input
                    type="number"
                    id="totalSeats"
                    name="totalSeats"
                    className="cbts-form-input"
                    placeholder="40"
                    value={formFields.totalSeats}
                    onChange={handleChange}
                    required
                  />
                  {errors.totalSeats && <span className="cbts-error-text">{errors.totalSeats}</span>}
                </div>

                {/* Available Seats (Only visible when editing) */}
                {editingBusId && (
                  <div className={`cbts-form-group ${errors.availableSeats ? 'has-error' : ''}`}>
                    <label className="cbts-form-label" htmlFor="availableSeats" style={{ fontSize: '0.85rem' }}>Available Seats</label>
                    <input
                      type="number"
                      id="availableSeats"
                      name="availableSeats"
                      className="cbts-form-input"
                      placeholder="40"
                      value={formFields.availableSeats}
                      onChange={handleChange}
                      required
                    />
                    {errors.availableSeats && <span className="cbts-error-text">{errors.availableSeats}</span>}
                  </div>
                )}

                {/* Status (Only visible when editing) */}
                {editingBusId && (
                  <div className="cbts-form-group">
                    <label className="cbts-form-label" htmlFor="status" style={{ fontSize: '0.85rem' }}>Status</label>
                    <select
                      id="status"
                      name="status"
                      className="cbts-form-select"
                      value={formFields.status}
                      onChange={handleChange}
                      required
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                )}

              </div>

              <div style={{ marginTop: '1.8rem', display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="cbts-btn cbts-btn-primary" style={{ flex: 2 }}>
                  {editingBusId ? 'Update Details' : 'Register Bus'}
                </button>
                {editingBusId && (
                  <button type="button" className="cbts-btn cbts-btn-secondary" onClick={handleCancelEdit} style={{ flex: 1 }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Panel: Registered Fleet Table List (65% on desktop) */}
          <div className="cbts-admin-card" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="cbts-register-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: 'var(--primary-navy)' }}>
              Registered Buses
            </h2>

            {loading ? (
              <div className="cbts-loader-container" style={{ padding: '3rem 0' }}>
                <div className="cbts-loader-spinner" style={{ width: '36px', height: '36px' }}></div>
                <p className="cbts-loader-text" style={{ fontSize: '0.9rem' }}>Loading records...</p>
              </div>
            ) : buses.length === 0 ? (
              <div className="cbts-empty-state" style={{ padding: '3rem 2rem' }}>
                <div className="cbts-empty-icon-container" style={{ width: '60px', height: '60px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon" style={{ width: '28px', height: '28px' }}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="10" y2="8" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                  </svg>
                </div>
                <h3 className="cbts-empty-title" style={{ fontSize: '1.2rem' }}>No Registered Vehicles</h3>
                <p className="cbts-empty-subtitle" style={{ fontSize: '0.85rem' }}>Submit the form to add a bus.</p>
              </div>
            ) : (
              <div className="cbts-bus-table-wrapper">
                <table className="cbts-admin-table" style={{ minWidth: '700px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'white' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Bus Number</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Driver</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Route</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Total Seats</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Available</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Status</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buses.map((bus) => (
                      <tr key={bus._id} style={{ background: editingBusId === bus._id ? 'rgba(11, 61, 145, 0.05)' : 'none' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-dark-primary)', padding: '1rem 1.25rem', fontSize: '0.9rem' }}>
                          {bus.busNumber}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem' }}>
                          <div style={{ fontWeight: 500 }}>{bus.driverName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>{bus.driverPhone}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem' }}>{bus.route}</td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>{bus.totalSeats}</td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>{bus.availableSeats}</td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span 
                            className="cbts-badge-pending" 
                            style={{ 
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.8rem',
                              background: bus.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : bus.status === 'Inactive' ? 'rgba(100, 116, 139, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: bus.status === 'Active' ? '#065F46' : bus.status === 'Inactive' ? '#334155' : '#991B1B'
                            }}
                          >
                            {bus.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div className="cbts-actions-cell">
                            <button
                              className="cbts-btn-action"
                              style={{ background: '#0F766E', borderColor: '#0F766E', color: '#ffffff', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => handleOpenQrModal(bus)}
                              disabled={qrLoadingId === bus._id}
                            >
                              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                              </svg>
                              {qrLoadingId === bus._id ? 'Generating...' : 'Generate Bus QR'}
                            </button>

                            <button
                              className="cbts-btn-action cbts-btn-approve"
                              style={{ background: 'var(--primary-navy)', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => handleEditClick(bus)}
                            >
                              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
                              </svg>
                              Edit
                            </button>
                            
                            <button
                              className="cbts-btn-action cbts-btn-reject"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => handleDeleteClick(bus._id)}
                            >
                              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
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

        </div>
      </main>

      {/* Bus QR Code Modal Dialog */}
      {qrModalData && (
        <div className="cbts-modal-overlay" onClick={() => setQrModalData(null)}>
          <div className="cbts-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cbts-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  Bus Boarding QR Code
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-secondary)' }}>
                  Official attendance QR for vehicle placement
                </p>
              </div>
              <button
                type="button"
                className="cbts-modal-close-btn"
                onClick={() => setQrModalData(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="cbts-bus-qr-container">
              <img
                src={qrModalData.qrDataUrl}
                alt={`QR for ${qrModalData.bus.busNumber}`}
                className="cbts-bus-qr-image"
              />

              <div className="cbts-bus-qr-info">
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.25rem' }}>
                  Bus Number: {qrModalData.bus.busNumber}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-dark-secondary)', marginBottom: '0.75rem' }}>
                  Route: {qrModalData.bus.route}
                </div>
                <div style={{ background: 'rgba(11, 61, 145, 0.05)', padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(11, 61, 145, 0.1)', display: 'inline-block', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dark-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                    QR Identifier
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-navy)', wordBreak: 'break-all' }}>
                    {qrModalData.qrId}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="cbts-btn cbts-btn-primary"
                onClick={handleDownloadQr}
                style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download QR
              </button>
              <button
                type="button"
                className="cbts-btn cbts-btn-secondary"
                onClick={handlePrintQr}
                style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print QR
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BusManagement;
