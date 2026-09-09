import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/register.css';
import '../styles/admin.css';

/**
 * Admin Bus Fee Management
 * 1. Bus Fee Schedules (Annual tariff per bus across 1st-4th years)
 * 2. UPI Payment QR Management (Upload, Preview, Replace, Remove)
 * 3. Student Payment Verification (Student-wise UTR review, Verify, Reject)
 */
const BusFeeManagement = () => {
  const navigate = useNavigate();

  // Active View Tab: 'schedules' | 'upi-qr' | 'payments'
  const [activeTab, setActiveTab] = useState('schedules');

  // Schedules Data
  const [fees, setFees] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

  // UPI QR State
  const [upiQr, setUpiQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrPreview, setQrPreview] = useState('');
  const [qrUpiId, setQrUpiId] = useState('');
  const [qrUpiName, setQrUpiName] = useState('College Bus Transport Fee');
  const [qrModalError, setQrModalError] = useState('');

  // Student Payments Data
  const [studentPayments, setStudentPayments] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [paymentsSummary, setPaymentsSummary] = useState({
    totalStudents: 0,
    paidCount: 0,
    unpaidCount: 0,
  });

  // Payment Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026-2027');
  const [selectedBusFilter, setSelectedBusFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Unpaid'
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Modal State for Add / Edit Fee
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null);

  // Form Fields for Bus Fee
  const [formFields, setFormFields] = useState({
    academicYear: '2026-2027',
    busId: '',
    amount: '',
    dueDate: '',
    status: 'Active',
  });

  const [formErrors, setFormErrors] = useState({});

  // Academic year options
  const academicYearOptions = [
    '2024-2025',
    '2025-2026',
    '2026-2027',
    '2027-2028',
    '2028-2029',
  ];

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userCollegeId = currentUser.collegeId?._id || currentUser.collegeId;

  // Fetch all fees and active buses dynamically from MongoDB
  const fetchData = async () => {
    try {
      setLoading(true);
      setGlobalError('');

      const params = userCollegeId ? { collegeId: userCollegeId } : {};

      const [feeRes, busRes] = await Promise.all([
        axios.get('http://localhost:5000/api/fee/all', { params }),
        axios.get('http://localhost:5000/api/bus/all', { params }),
      ]);

      if (feeRes.data && feeRes.data.fees) {
        setFees(feeRes.data.fees);
      }

      if (busRes.data && busRes.data.buses) {
        setBuses(busRes.data.buses);
      }
    } catch (err) {
      console.error('Error loading bus fee management data:', err);
      setGlobalError(err.response?.data?.message || 'Failed to load bus fees and fleet records from database.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch active UPI QR from MongoDB
  const fetchUpiQr = async () => {
    try {
      setQrLoading(true);
      const params = userCollegeId ? { collegeId: userCollegeId } : {};
      const res = await axios.get('http://localhost:5000/api/fee/upi-qr', { params });
      if (res.data && res.data.success) {
        if (res.data.isConfigured && res.data.upiQr) {
          setUpiQr(res.data.upiQr);
          setQrUpiId(res.data.upiQr.upiId || '');
          setQrUpiName(res.data.upiQr.upiName || 'College Bus Transport Fee');
        } else {
          setUpiQr(null);
        }
      }
    } catch (err) {
      console.error('Error loading UPI QR:', err);
    } finally {
      setQrLoading(false);
    }
  };

  // Fetch student payments data for the payments tab
  const fetchStudentPayments = async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsError('');

      const params = {
        academicYear: selectedAcademicYear,
      };
      if (userCollegeId) {
        params.collegeId = userCollegeId;
      }
      if (selectedBusFilter !== 'All') {
        params.busId = selectedBusFilter;
      }
      if (selectedStatusFilter !== 'All') {
        params.status = selectedStatusFilter;
      }

      const res = await axios.get('http://localhost:5000/api/fee/student-payments', { params });
      if (res.data && res.data.success) {
        setStudentPayments(res.data.students || []);
        setRecentPayments(res.data.recentPayments || []);
        setPaymentsSummary({
          totalStudents: res.data.totalStudents || 0,
          paidCount: res.data.paidCount || 0,
          unpaidCount: res.data.unpaidCount || 0,
        });
      }
    } catch (err) {
      console.error('Error loading student payments:', err);
      setPaymentsError(err.response?.data?.message || 'Failed to fetch student payment records.');
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUpiQr();
    fetchStudentPayments();
  }, []);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchStudentPayments();
    } else if (activeTab === 'upi-qr') {
      fetchUpiQr();
    }
  }, [activeTab, selectedAcademicYear, selectedBusFilter, selectedStatusFilter]);

  // Handle file select for UPI QR Image
  const handleQrFileSelect = (e) => {
    const file = e.target.files?.[0];
    setQrModalError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setQrModalError('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setQrModalError('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setQrPreview(reader.result);
    };
    reader.onerror = () => {
      setQrModalError('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  // Save or replace active UPI QR
  const handleSaveUpiQr = async (e) => {
    e.preventDefault();
    if (!qrPreview) {
      setQrModalError('Please select or upload a QR image.');
      return;
    }

    try {
      setQrUploading(true);
      setQrModalError('');
      setGlobalError('');

      const payload = {
        upiQrImage: qrPreview,
        upiId: qrUpiId.trim(),
        upiName: qrUpiName.trim() || 'College Bus Transport Fee',
      };

      const res = await axios.post('http://localhost:5000/api/fee/upi-qr', payload);
      if (res.data && res.data.success) {
        setUpiQr(res.data.upiQr);
        setSuccess('UPI Payment QR Activated Successfully ✓');
        setQrModalOpen(false);
        setQrPreview('');
        await fetchUpiQr();
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err) {
      console.error('Error saving UPI QR:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save UPI Payment QR.';
      setQrModalError(errorMsg);
    } finally {
      setQrUploading(false);
    }
  };

  // Remove active UPI QR
  const handleRemoveUpiQr = async () => {
    if (!window.confirm('Are you sure you want to remove the active UPI Payment QR? Students will not see a payment QR until a new one is uploaded.')) {
      return;
    }

    try {
      setQrLoading(true);
      setGlobalError('');
      const res = await axios.delete('http://localhost:5000/api/fee/upi-qr');
      if (res.data && res.data.success) {
        setUpiQr(null);
        setSuccess('UPI Payment QR removed successfully.');
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err) {
      console.error('Error removing UPI QR:', err);
      setGlobalError(err.response?.data?.message || 'Failed to remove UPI Payment QR.');
    } finally {
      setQrLoading(false);
    }
  };

  // Admin verifies or rejects student payment
  const handleAdminVerifyPayment = async (record, action) => {
    const actionLabel = action === 'verify' ? 'VERIFY and mark as PAID' : 'REJECT';
    let rejectionReason = '';

    if (action === 'reject') {
      const reasonInput = window.prompt(
        `Please specify the reason for rejecting ${record.name}'s payment (UTR: ${record.transactionId || 'N/A'}):`,
        'Invalid or unverifiable UPI Transaction ID / UTR.'
      );
      if (reasonInput === null) return; // User cancelled
      rejectionReason = reasonInput.trim() || 'Invalid or unverifiable UPI Transaction ID / UTR.';
    } else {
      if (!window.confirm(`Confirm: ${actionLabel} for student ${record.name} (${record.registerNumber}) on Bus ${record.bus?.busNumber}?`)) {
        return;
      }
    }

    try {
      setVerifyingPaymentId(record.studentId);
      setGlobalError('');

      const payload = {
        paymentId: record.paymentId,
        studentId: record.studentId,
        busId: record.bus?._id,
        academicYear: record.academicYear,
        action,
        rejectionReason,
      };

      const res = await axios.post('http://localhost:5000/api/fee/verify-payment', payload);
      if (res.data && res.data.success) {
        setSuccess(res.data.message || `Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully.`);
        await fetchStudentPayments();
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setGlobalError(err.response?.data?.message || 'Failed to process payment verification.');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  // Open Add Fee Modal
  const handleOpenAddModal = () => {
    setEditingFeeId(null);
    setFormFields({
      academicYear: selectedAcademicYear || '2026-2027',
      busId: buses.length > 0 ? buses[0]._id : '',
      amount: '',
      dueDate: '',
      status: 'Active',
    });
    setFormErrors({});
    setModalError('');
    setGlobalError('');
    setIsModalOpen(true);
  };

  // Open Edit Fee Modal
  const handleOpenEditModal = (fee) => {
    setEditingFeeId(fee._id);
    let formattedDate = '';
    if (fee.dueDate) {
      const d = new Date(fee.dueDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }

    const busIdVal = fee.busId?._id
      ? fee.busId._id.toString()
      : fee.busId
      ? fee.busId.toString()
      : buses.length > 0
      ? buses[0]._id
      : '';

    setFormFields({
      academicYear: fee.academicYear || '2026-2027',
      busId: busIdVal,
      amount: fee.amount !== undefined && fee.amount !== null ? fee.amount.toString() : '',
      dueDate: formattedDate,
      status: fee.status || 'Active',
    });
    setFormErrors({});
    setModalError('');
    setGlobalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFeeId(null);
    setFormErrors({});
    setModalError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setModalError('');
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!formFields.academicYear || !formFields.academicYear.trim()) {
      errors.academicYear = 'Academic Year is required';
      isValid = false;
    }

    if (!formFields.busId) {
      errors.busId = 'Please select a bus from the fleet';
      isValid = false;
    }

    const numAmount = Number(formFields.amount);
    if (!formFields.amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Amount must be a positive number greater than zero';
      isValid = false;
    }

    if (!formFields.dueDate) {
      errors.dueDate = 'Due Date is required';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmitFee = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setGlobalError('');
      setModalError('');
      setSuccess('');

      const payload = {
        academicYear: formFields.academicYear.trim(),
        busId: formFields.busId,
        amount: Number(formFields.amount),
        dueDate: formFields.dueDate,
        status: formFields.status,
      };

      if (editingFeeId) {
        const res = await axios.put(`http://localhost:5000/api/fee/update/${editingFeeId}`, payload);
        if (res.data && res.data.success) {
          if (res.data.fee) {
            setFees((prev) => prev.map((f) => (f._id === editingFeeId ? res.data.fee : f)));
          }
          setSuccess(res.data.message || 'Bus fee updated successfully.');
          setIsModalOpen(false);
          setEditingFeeId(null);
          await fetchData();
          await fetchStudentPayments();
          setTimeout(() => setSuccess(''), 3500);
        }
      } else {
        const res = await axios.post('http://localhost:5000/api/fee/create', payload);
        if (res.data && res.data.success) {
          setSuccess(res.data.message || 'Bus fee created successfully.');
          setIsModalOpen(false);
          setEditingFeeId(null);
          await fetchData();
          await fetchStudentPayments();
          setTimeout(() => setSuccess(''), 3500);
        }
      }
    } catch (err) {
      console.error('Error saving bus fee:', err);
      const errMsg = err.response?.data?.message || 'Failed to save bus fee.';
      setModalError(errMsg);
      setGlobalError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (feeId, currentStatus) => {
    try {
      setGlobalError('');
      const targetStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const res = await axios.patch(`http://localhost:5000/api/fee/status/${feeId}`, {
        status: targetStatus,
      });

      if (res.data && res.data.success) {
        setSuccess(res.data.message || `Fee marked as ${targetStatus}.`);
        await fetchData();
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err) {
      console.error('Error toggling fee status:', err);
      setGlobalError(err.response?.data?.message || 'Failed to update fee status.');
    }
  };

  // Format currency
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Calculate total revenue collected
  const totalRevenueCollected = studentPayments
    .filter((st) => st.status === 'Paid')
    .reduce((sum, st) => sum + (Number(st.feeAmount) || 0), 0);

  // Filter student payments by search query in frontend
  const filteredStudentPayments = studentPayments.filter((st) => {
    if (!studentSearchTerm.trim()) return true;
    const term = studentSearchTerm.toLowerCase();
    return (
      (st.name && st.name.toLowerCase().includes(term)) ||
      (st.registerNumber && st.registerNumber.toLowerCase().includes(term)) ||
      (st.department && st.department.toLowerCase().includes(term)) ||
      (st.bus?.busNumber && st.bus.busNumber.toLowerCase().includes(term)) ||
      (st.transactionId && st.transactionId.toLowerCase().includes(term))
    );
  });

  const selectedBusDetails = buses.find((b) => b._id === formFields.busId);

  return (
    <div className="cbts-admin-wrapper">
      {/* Background blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-admin-content" style={{ maxWidth: '1340px' }}>
        {/* Header Section */}
        <header className="cbts-admin-header">
          <div className="cbts-admin-title-group">
            <h1 className="cbts-admin-title">Bus Fee Management</h1>
            <p className="cbts-admin-subtitle">
              Manage unified fleet tariff rates, upload official UPI payment QR, and verify student payments.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="cbts-btn cbts-btn-primary"
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(11, 61, 145, 0.25)',
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Add Bus Fee
            </button>

            <button
              className="cbts-admin-btn-exit"
              onClick={() => {
                setQrPreview(upiQr?.upiQrImage || '');
                setQrUpiId(upiQr?.upiId || '');
                setQrUpiName(upiQr?.upiName || 'College Bus Transport Fee');
                setQrModalError('');
                setQrModalOpen(true);
              }}
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#065F46',
                borderColor: 'rgba(16, 185, 129, 0.25)',
                fontWeight: 700,
              }}
            >
              📷 {upiQr ? 'Replace UPI QR' : 'Upload UPI QR'}
            </button>

            <button
              className="cbts-admin-btn-exit"
              onClick={() => navigate('/admin/buses')}
              style={{ background: 'rgba(11, 61, 145, 0.08)', color: 'var(--primary-navy)', borderColor: 'rgba(11, 61, 145, 0.2)' }}
            >
              Manage Fleet
            </button>

            <button
              className="cbts-admin-btn-exit"
              onClick={() => navigate('/admin/bus-assignment')}
              style={{ background: 'rgba(11, 61, 145, 0.08)', color: 'var(--primary-navy)', borderColor: 'rgba(11, 61, 145, 0.2)' }}
            >
              Bus Assignment
            </button>

            <button
              className="cbts-admin-btn-exit"
              onClick={() => navigate('/admin')}
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Global Alerts */}
        {globalError && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
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

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(11, 61, 145, 0.1)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '12px',
              border: activeTab === 'schedules' ? '2px solid var(--primary-navy)' : '1px solid rgba(11, 61, 145, 0.15)',
              background: activeTab === 'schedules' ? 'var(--primary-navy)' : 'rgba(255, 255, 255, 0.6)',
              color: activeTab === 'schedules' ? '#ffffff' : 'var(--primary-navy)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'schedules' ? '0 4px 12px rgba(11, 61, 145, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Fee Schedules ({fees.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upi-qr')}
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '12px',
              border: activeTab === 'upi-qr' ? '2px solid var(--primary-navy)' : '1px solid rgba(11, 61, 145, 0.15)',
              background: activeTab === 'upi-qr' ? 'var(--primary-navy)' : 'rgba(255, 255, 255, 0.6)',
              color: activeTab === 'upi-qr' ? '#ffffff' : 'var(--primary-navy)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'upi-qr' ? '0 4px 12px rgba(11, 61, 145, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            UPI Payment QR
            {upiQr ? (
              <span style={{ background: '#10B981', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                Active ✓
              </span>
            ) : (
              <span style={{ background: '#EF4444', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                Not Configured
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('payments');
              fetchStudentPayments();
            }}
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '12px',
              border: activeTab === 'payments' ? '2px solid var(--primary-navy)' : '1px solid rgba(11, 61, 145, 0.15)',
              background: activeTab === 'payments' ? 'var(--primary-navy)' : 'rgba(255, 255, 255, 0.6)',
              color: activeTab === 'payments' ? '#ffffff' : 'var(--primary-navy)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'payments' ? '0 4px 12px rgba(11, 61, 145, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Student Payment Status ({paymentsSummary.totalStudents})
            {paymentsSummary.pendingCount > 0 && (
              <span style={{ background: '#F59E0B', color: '#78350F', padding: '0.1rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                {paymentsSummary.pendingCount} Pending Review
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FEE SCHEDULES */}
        {activeTab === 'schedules' && (
          <div>
            {/* Stats Overview Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Fleet Buses
                </span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: 'var(--primary-navy)' }}>
                  {buses.length} Buses
                </p>
              </div>

              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Configured Fee Schedules
                </span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: 'var(--primary-navy)' }}>
                  {fees.length}
                </p>
              </div>

              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Fee Rates
                </span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: '#10B981' }}>
                  {fees.filter((f) => f.status === 'Active').length} Active
                </p>
              </div>
            </div>

            {/* Fees Table Card */}
            <div className="cbts-admin-card" style={{ padding: '2rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                    Fleet Fee Schedules
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--text-dark-muted)' }}>
                    Each bus rate is uniformly charged to all assigned students regardless of student academic year.
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dark-muted)', fontWeight: 600 }}>
                  {fees.length} Fee Schedules Configured
                </span>
              </div>

              {loading ? (
                <div className="cbts-loader-container" style={{ padding: '3.5rem 0' }}>
                  <div className="cbts-loader-spinner"></div>
                  <p className="cbts-loader-text">Fetching bus fleet fee records from MongoDB...</p>
                </div>
              ) : fees.length === 0 ? (
                <div className="cbts-empty-state" style={{ padding: '3.5rem 1rem' }}>
                  <div className="cbts-empty-icon-container" style={{ width: '64px', height: '64px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon" style={{ width: '32px', height: '32px' }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                      <line x1="6" y1="15" x2="10" y2="15" />
                    </svg>
                  </div>
                  <h3 className="cbts-empty-title" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>No Bus Fees Configured</h3>
                  <p className="cbts-empty-subtitle" style={{ maxWidth: '440px', marginBottom: '1.5rem' }}>
                    No transport fees have been registered yet. Create a fee for any bus in your fleet ({buses.length} buses currently available).
                  </p>
                  <button
                    className="cbts-btn cbts-btn-primary"
                    onClick={handleOpenAddModal}
                    style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }}
                  >
                    + Add Bus Fee
                  </button>
                </div>
              ) : (
                <div className="cbts-table-container">
                  <table className="cbts-admin-table">
                    <thead>
                      <tr>
                        <th>Academic Year</th>
                        <th>Bus Details</th>
                        <th>Driver & Contact</th>
                        <th>Applies To</th>
                        <th>Annual Fee Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee) => {
                        const busInfo = fee.busId;
                        const isActive = fee.status === 'Active';
                        return (
                          <tr key={fee._id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary-navy)', whiteSpace: 'nowrap' }}>
                              {fee.academicYear}
                            </td>
                            <td>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-navy)' }}>
                                    Bus {busInfo?.busNumber || 'N/A'}
                                  </span>
                                </div>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--text-dark-secondary)', fontWeight: 500 }}>
                                  Route: {busInfo?.route || 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-dark-primary)', fontSize: '0.92rem' }}>
                                  {busInfo?.driverName || 'Not Assigned'}
                                </p>
                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--primary-navy)', fontWeight: 600 }}>
                                  📞 {busInfo?.driverPhone || 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td>
                              <span
                                className="cbts-dept-badge"
                                style={{
                                  background: 'rgba(11, 61, 145, 0.08)',
                                  color: 'var(--primary-navy)',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                }}
                              >
                                All Students (1st–4th Yr)
                              </span>
                            </td>
                            <td style={{ fontWeight: 800, fontSize: '1.15rem', color: '#065F46', whiteSpace: 'nowrap' }}>
                              {formatCurrency(fee.amount)}
                            </td>
                            <td style={{ color: 'var(--text-dark-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {formatDate(fee.dueDate)}
                            </td>
                            <td>
                              <span
                                className="cbts-device-badge"
                                style={{
                                  background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                                  color: isActive ? '#065F46' : '#4B5563',
                                  border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(107, 114, 128, 0.25)',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isActive ? '● Active' : '○ Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="cbts-actions-cell" style={{ justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="cbts-btn-action"
                                  onClick={() => handleOpenEditModal(fee)}
                                  style={{
                                    background: 'rgba(11, 61, 145, 0.08)',
                                    color: 'var(--primary-navy)',
                                    border: '1px solid rgba(11, 61, 145, 0.15)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="cbts-btn-action"
                                  onClick={() => handleToggleStatus(fee._id, fee.status)}
                                  style={{
                                    background: isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                    color: isActive ? '#991B1B' : '#065F46',
                                    border: isActive ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: UPI PAYMENT QR MANAGEMENT */}
        {activeTab === 'upi-qr' && (
          <div className="cbts-admin-card" style={{ padding: '2.5rem 2rem', maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  UPI Payment QR Configuration
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--text-dark-secondary)' }}>
                  Upload the official college bank/UPI QR code. All students assigned to buses will scan this QR to pay their fees.
                </p>
              </div>

              <div>
                {upiQr ? (
                  <span
                    className="cbts-device-badge cbts-device-badge-registered"
                    style={{ fontWeight: 800, fontSize: '0.88rem', padding: '0.45rem 0.9rem' }}
                  >
                    Active UPI Payment QR ✓
                  </span>
                ) : (
                  <span
                    className="cbts-device-badge"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#991B1B', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 800, fontSize: '0.88rem', padding: '0.45rem 0.9rem' }}
                  >
                    No Active QR Configured
                  </span>
                )}
              </div>
            </div>

            {qrLoading ? (
              <div className="cbts-loader-container" style={{ padding: '3rem 0' }}>
                <div className="cbts-loader-spinner"></div>
                <p className="cbts-loader-text">Loading QR settings from MongoDB...</p>
              </div>
            ) : upiQr ? (
              <div
                style={{
                  background: 'rgba(11, 61, 145, 0.03)',
                  border: '1.5px solid rgba(11, 61, 145, 0.15)',
                  borderRadius: '20px',
                  padding: '2rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '2rem',
                  alignItems: 'center',
                }}
              >
                {/* QR Image Preview */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '1rem',
                      borderRadius: '16px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      display: 'inline-block',
                      border: '2px solid rgba(11, 61, 145, 0.1)',
                    }}
                  >
                    <img
                      src={upiQr.upiQrImage}
                      alt="Active College Bus Fee UPI QR"
                      style={{
                        width: '220px',
                        height: '220px',
                        objectFit: 'contain',
                        display: 'block',
                        borderRadius: '8px',
                      }}
                    />
                  </div>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 600 }}>
                    Active QR Code used in student checkout
                  </p>
                </div>

                {/* QR Meta Details & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark-muted)', textTransform: 'uppercase' }}>
                      Account / Merchant Name
                    </span>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                      {upiQr.upiName || 'College Bus Transport Fee'}
                    </p>
                  </div>

                  {upiQr.upiId && (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark-muted)', textTransform: 'uppercase' }}>
                        UPI VPA / ID
                      </span>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-navy)' }}>
                        {upiQr.upiId}
                      </p>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark-muted)', textTransform: 'uppercase' }}>
                      Last Updated
                    </span>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-secondary)', fontWeight: 600 }}>
                      {formatDateTime(upiQr.updatedAt)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-primary"
                      onClick={() => {
                        setQrPreview(upiQr.upiQrImage);
                        setQrUpiId(upiQr.upiId || '');
                        setQrUpiName(upiQr.upiName || 'College Bus Transport Fee');
                        setQrModalError('');
                        setQrModalOpen(true);
                      }}
                      style={{ padding: '0.65rem 1.4rem', fontWeight: 700, fontSize: '0.9rem' }}
                    >
                      Replace QR Image
                    </button>

                    <button
                      type="button"
                      className="cbts-btn cbts-btn-secondary"
                      onClick={handleRemoveUpiQr}
                      style={{
                        padding: '0.65rem 1.25rem',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#991B1B',
                      }}
                    >
                      Remove QR
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cbts-empty-state" style={{ padding: '3.5rem 1.5rem', border: '2px dashed rgba(11, 61, 145, 0.2)', borderRadius: '20px' }}>
                <div className="cbts-empty-icon-container" style={{ width: '64px', height: '64px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon" style={{ width: '32px', height: '32px' }}>
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <h3 className="cbts-empty-title" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>No Active UPI Payment QR</h3>
                <p className="cbts-empty-subtitle" style={{ maxWidth: '460px', marginBottom: '1.5rem' }}>
                  Students cannot view a payment QR during checkout until you upload the official college transport QR code.
                </p>
                <button
                  type="button"
                  className="cbts-btn cbts-btn-primary"
                  onClick={() => {
                    setQrPreview('');
                    setQrUpiId('');
                    setQrUpiName('College Bus Transport Fee');
                    setQrModalError('');
                    setQrModalOpen(true);
                  }}
                  style={{ padding: '0.75rem 1.8rem', fontWeight: 700, fontSize: '0.95rem' }}
                >
                  + Upload UPI Payment QR
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENT PAYMENT STATUS & RECENT PAYMENTS */}
        {activeTab === 'payments' && (
          <div>
            {/* Student Payment Stats Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Assigned Students
                </span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: 'var(--primary-navy)' }}>
                  {paymentsSummary.totalStudents} Students
                </p>
              </div>

              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fee Paid (Paid ✓)
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: '#10B981' }}>
                    {paymentsSummary.paidCount}
                  </p>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10B981' }}>
                    ({paymentsSummary.totalStudents > 0 ? Math.round((paymentsSummary.paidCount / paymentsSummary.totalStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fee Unpaid
                </span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: '#6B7280' }}>
                  {paymentsSummary.unpaidCount}
                </p>
              </div>

              <div className="cbts-bus-seat-metric" style={{ background: 'var(--bg-card-glass)', borderColor: 'var(--border-glass)', padding: '1.25rem 1.5rem', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Fee Collected
                </span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0 0', color: '#065F46' }}>
                  {formatCurrency(totalRevenueCollected)}
                </p>
              </div>
            </div>

            {/* RECENT BUS FEE PAYMENTS SECTION */}
            <div className="cbts-admin-card" style={{ padding: '2rem 1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚡</span> Recent Bus Fee Payments
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--text-dark-muted)' }}>
                    Real-time confirmed student payments, ordered by most recent first.
                  </p>
                </div>
                <span className="cbts-dept-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#065F46', fontWeight: 700 }}>
                  {recentPayments.length} Recent Payments
                </span>
              </div>

              {recentPayments.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'rgba(11, 61, 145, 0.02)', borderRadius: '16px', border: '1px dashed rgba(11, 61, 145, 0.15)' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-muted)', fontSize: '0.92rem' }}>
                    No student bus fee payments recorded yet. Confirmed payments will appear here in real time.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.15rem' }}>
                  {recentPayments.map((p) => (
                    <div
                      key={p.paymentId}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                            {p.studentName}
                          </h4>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.84rem', color: 'var(--text-dark-secondary)', fontWeight: 600 }}>
                            {p.registerNumber} • {p.department} ({p.year} Yr)
                          </p>
                        </div>
                        <span
                          className="cbts-device-badge cbts-device-badge-registered"
                          style={{
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.65rem',
                            background: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #10B981',
                          }}
                        >
                          Paid ✓
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 61, 145, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Bus & Route</span>
                          <p style={{ margin: '0.1rem 0 0', fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary-navy)' }}>
                            Bus {p.busNumber}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Amount</span>
                          <p style={{ margin: '0.1rem 0 0', fontWeight: 800, fontSize: '1.1rem', color: '#065F46' }}>
                            {formatCurrency(p.amount)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.65rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.74rem', fontWeight: 600, display: 'block' }}>UTR / Transaction ID</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-navy)' }}>
                            {p.transactionId || 'TXN-CONFIRMED'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.74rem', fontWeight: 600, display: 'block' }}>Payment Timestamp</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-dark-primary)' }}>
                            {formatDateTime(p.paidAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Bar Card */}
            <div className="cbts-admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                {/* Search */}
                <div>
                  <label className="cbts-form-label" style={{ fontSize: '0.82rem' }}>Search Student / UTR</label>
                  <input
                    type="text"
                    placeholder="Search name, reg no, UTR..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="cbts-form-input"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 0.85rem' }}
                  />
                </div>

                {/* Academic Year Filter */}
                <div>
                  <label className="cbts-form-label" style={{ fontSize: '0.82rem' }}>Academic Year</label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="cbts-form-input"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 0.85rem' }}
                  >
                    {academicYearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Bus Filter */}
                <div>
                  <label className="cbts-form-label" style={{ fontSize: '0.82rem' }}>Filter by Bus</label>
                  <select
                    value={selectedBusFilter}
                    onChange={(e) => setSelectedBusFilter(e.target.value)}
                    className="cbts-form-input"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 0.85rem' }}
                  >
                    <option value="All">All Buses ({buses.length})</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>
                        Bus {b.busNumber} ({b.route})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="cbts-form-label" style={{ fontSize: '0.82rem' }}>Payment Status</label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="cbts-form-input"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 0.85rem' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid ({paymentsSummary.paidCount})</option>
                    <option value="Unpaid">Unpaid ({paymentsSummary.unpaidCount})</option>
                  </select>
                </div>

                {/* Refresh Button */}
                <div>
                  <button
                    type="button"
                    className="cbts-btn cbts-btn-secondary"
                    onClick={fetchStudentPayments}
                    disabled={paymentsLoading}
                    style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.88rem', fontWeight: 600 }}
                  >
                    {paymentsLoading ? 'Refreshing...' : '↻ Refresh Status'}
                  </button>
                </div>
              </div>
            </div>

            {/* Student Payments Table Card */}
            <div className="cbts-admin-card" style={{ padding: '2rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                    Student Bus Fee Payment Records
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--text-dark-muted)' }}>
                    Complete database record of all assigned students and confirmed payments.
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dark-muted)', fontWeight: 600 }}>
                  Showing {filteredStudentPayments.length} Students
                </span>
              </div>

              {paymentsError && (
                <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                  </svg>
                  <span>{paymentsError}</span>
                </div>
              )}

              {paymentsLoading ? (
                <div className="cbts-loader-container" style={{ padding: '3.5rem 0' }}>
                  <div className="cbts-loader-spinner"></div>
                  <p className="cbts-loader-text">Loading student payment records from MongoDB...</p>
                </div>
              ) : filteredStudentPayments.length === 0 ? (
                <div className="cbts-empty-state" style={{ padding: '3.5rem 1rem' }}>
                  <div className="cbts-empty-icon-container" style={{ width: '64px', height: '64px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon" style={{ width: '32px', height: '32px' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="cbts-empty-title" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>No Student Records Found</h3>
                  <p className="cbts-empty-subtitle" style={{ maxWidth: '440px', marginBottom: '1rem' }}>
                    No students match the current filter criteria.
                  </p>
                </div>
              ) : (
                <div className="cbts-table-container">
                  <table className="cbts-admin-table">
                    <thead>
                      <tr>
                        <th>Student Name & Reg No</th>
                        <th>Class & Dept</th>
                        <th>Assigned Bus</th>
                        <th>Academic Year</th>
                        <th>Fee Amount</th>
                        <th>Payment Status</th>
                        <th>Transaction ID / UTR</th>
                        <th>Paid Date</th>
                        <th>Paid Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentPayments.map((record) => {
                        const isPaid = record.status === 'Paid';

                        return (
                          <tr key={record.studentId}>
                            {/* Name & Reg */}
                            <td>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.98rem' }}>
                                  {record.name}
                                </span>
                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.84rem', color: 'var(--text-dark-secondary)', fontWeight: 600 }}>
                                  {record.registerNumber}
                                </p>
                              </div>
                            </td>

                            {/* Class & Dept */}
                            <td>
                              <span className="cbts-dept-badge" style={{ background: 'rgba(11, 61, 145, 0.06)', color: 'var(--primary-navy)' }}>
                                {record.department} - {record.year} Yr ({record.section})
                              </span>
                            </td>

                            {/* Assigned Bus */}
                            <td>
                              <div>
                                <span style={{ fontWeight: 800, color: 'var(--primary-navy)' }}>
                                  Bus {record.bus?.busNumber || 'N/A'}
                                </span>
                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-dark-muted)' }}>
                                  {record.bus?.route || 'N/A'}
                                </p>
                              </div>
                            </td>

                            {/* Academic Year */}
                            <td style={{ fontWeight: 600, color: 'var(--text-dark-primary)' }}>
                              {record.academicYear}
                            </td>

                            {/* Fee Amount */}
                            <td style={{ fontWeight: 800, fontSize: '1.05rem', color: '#065F46' }}>
                              {formatCurrency(record.feeAmount)}
                            </td>

                            {/* Status Badge */}
                            <td>
                              {isPaid ? (
                                <span
                                  className="cbts-device-badge cbts-device-badge-registered"
                                  style={{
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    padding: '0.35rem 0.75rem',
                                    background: '#ECFDF5',
                                    color: '#065F46',
                                    border: '1.5px solid #10B981',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  ● Paid ✓
                                </span>
                              ) : (
                                <span
                                  className="cbts-device-badge"
                                  style={{
                                    background: 'rgba(107, 114, 128, 0.1)',
                                    color: '#4B5563',
                                    border: '1px solid rgba(107, 114, 128, 0.25)',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    padding: '0.35rem 0.75rem',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  ○ Unpaid
                                </span>
                              )}
                            </td>

                            {/* UTR / Transaction ID */}
                            <td>
                              {isPaid && record.transactionId ? (
                                <div>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontWeight: 800,
                                      fontSize: '0.92rem',
                                      color: 'var(--primary-navy)',
                                      background: 'rgba(11, 61, 145, 0.08)',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '6px',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {record.transactionId}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.84rem' }}>
                                  —
                                </span>
                              )}
                            </td>

                            {/* Paid Date */}
                            <td style={{ fontSize: '0.84rem', color: 'var(--text-dark-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {isPaid && record.paidAt ? formatDate(record.paidAt) : '—'}
                            </td>

                            {/* Paid Time */}
                            <td style={{ fontSize: '0.84rem', color: 'var(--text-dark-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {isPaid && record.paidAt ? formatTime(record.paidAt) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Upload / Replace UPI QR Modal */}
      {qrModalOpen && (
        <div
          className="cbts-qr-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 15, 36, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => {
            if (!qrUploading) setQrModalOpen(false);
          }}
        >
          <div
            className="cbts-hero-card"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '2.25rem',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'fadeInUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  {upiQr ? 'Replace UPI Payment QR' : 'Upload Official UPI Payment QR'}
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-dark-secondary)' }}>
                  This active QR will be displayed to all students during bus fee checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                disabled={qrUploading}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dark-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Error banner */}
            {qrModalError && (
              <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                </svg>
                <span>{qrModalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveUpiQr} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* File Input */}
              <div>
                <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>
                  Select QR Code Image (PNG, JPG, WEBP)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleQrFileSelect}
                  className="cbts-form-input"
                  style={{ fontSize: '0.88rem', padding: '0.5rem' }}
                />
              </div>

              {/* Preview Area */}
              {qrPreview ? (
                <div style={{ textAlign: 'center', background: 'rgba(11, 61, 145, 0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(11, 61, 145, 0.1)' }}>
                  <img
                    src={qrPreview}
                    alt="QR Preview"
                    style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                  />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#065F46', fontWeight: 700 }}>
                    ✓ Image selected ready to save
                  </p>
                </div>
              ) : (
                <div style={{ padding: '1.5rem', border: '2px dashed rgba(11, 61, 145, 0.2)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-dark-muted)', fontSize: '0.85rem' }}>
                  Choose an image file of your bank/UPI QR code
                </div>
              )}

              {/* Optional UPI Name & VPA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="cbts-form-label" style={{ fontSize: '0.82rem' }}>Merchant / Display Name</label>
                  <input
                    type="text"
                    value={qrUpiName}
                    onChange={(e) => setQrUpiName(e.target.value)}
                    placeholder="e.g. College Bus Transport Fee"
                    className="cbts-form-input"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 0.8rem' }}
                  />
                </div>

                <div>
                  <label className="cbts-form-label" style={{ fontSize: '0.82rem' }}>UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={qrUpiId}
                    onChange={(e) => setQrUpiId(e.target.value)}
                    placeholder="e.g. 9845123456@upi or yourname@okaxis"
                    className="cbts-form-input"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 0.8rem' }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="cbts-btn cbts-btn-secondary"
                  onClick={() => setQrModalOpen(false)}
                  disabled={qrUploading}
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cbts-btn cbts-btn-primary"
                  disabled={qrUploading || !qrPreview}
                  style={{ padding: '0.65rem 1.75rem', fontWeight: 800 }}
                >
                  {qrUploading ? 'Activating QR...' : 'Save & Activate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Bus Fee Modal */}
      {isModalOpen && (
        <div
          className="cbts-qr-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 15, 36, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={handleCloseModal}
        >
          <div
            className="cbts-hero-card"
            style={{
              maxWidth: '580px',
              width: '100%',
              padding: '2.25rem',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'fadeInUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  {editingFeeId ? 'Edit Bus Fee Schedule' : 'Create Bus Fee Schedule'}
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'var(--text-dark-secondary)' }}>
                  This fee applies to all students (1st–4th Year) allocated to this bus.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dark-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Error Alert */}
            {modalError && (
              <div
                className="cbts-form-alert"
                role="alert"
                style={{
                  marginBottom: '1rem',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#991B1B',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitFee} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Row 1: Select Bus (Dynamic from MongoDB) */}
              <div className="cbts-form-group" style={{ margin: 0 }}>
                <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>
                  Select Bus Fleet (from MongoDB)
                </label>
                {buses.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#991B1B' }}>
                    No buses found in MongoDB. Please register a bus first in Fleet Management.
                  </p>
                ) : (
                  <select
                    name="busId"
                    value={formFields.busId}
                    onChange={handleInputChange}
                    className="cbts-form-input"
                    style={{ fontSize: '0.92rem', padding: '0.7rem 0.85rem' }}
                  >
                    <option value="" disabled>-- Select Bus --</option>
                    {buses.map((bus) => (
                      <option key={bus._id} value={bus._id}>
                        Bus {bus.busNumber} • {bus.route} (Driver: {bus.driverName} - {bus.driverPhone})
                      </option>
                    ))}
                  </select>
                )}
                {formErrors.busId && (
                  <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>
                    {formErrors.busId}
                  </span>
                )}
              </div>

              {/* Selected Bus Live Preview Box */}
              {selectedBusDetails && (
                <div
                  style={{
                    background: 'rgba(11, 61, 145, 0.04)',
                    border: '1px solid rgba(11, 61, 145, 0.12)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.65rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-dark-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Bus Route
                    </span>
                    <p style={{ margin: '0.1rem 0 0', fontWeight: 700, color: 'var(--primary-navy)' }}>
                      {selectedBusDetails.route || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dark-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Driver & Contact
                    </span>
                    <p style={{ margin: '0.1rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                      {selectedBusDetails.driverName} ({selectedBusDetails.driverPhone})
                    </p>
                  </div>
                </div>
              )}

              {/* Row 2: Academic Year & Fee Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="cbts-form-group" style={{ margin: 0 }}>
                  <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>Academic Year</label>
                  <select
                    name="academicYear"
                    value={formFields.academicYear}
                    onChange={handleInputChange}
                    className="cbts-form-input"
                    style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  {formErrors.academicYear && (
                    <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>
                      {formErrors.academicYear}
                    </span>
                  )}
                </div>

                <div className="cbts-form-group" style={{ margin: 0 }}>
                  <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>Fee Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formFields.amount}
                    onChange={handleInputChange}
                    placeholder="e.g. 10000"
                    min="1"
                    step="1"
                    className="cbts-form-input"
                    style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  />
                  {formErrors.amount && (
                    <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>
                      {formErrors.amount}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: Due Date & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="cbts-form-group" style={{ margin: 0 }}>
                  <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>Payment Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formFields.dueDate}
                    onChange={handleInputChange}
                    className="cbts-form-input"
                    style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  />
                  {formErrors.dueDate && (
                    <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>
                      {formErrors.dueDate}
                    </span>
                  )}
                </div>

                <div className="cbts-form-group" style={{ margin: 0 }}>
                  <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>Status</label>
                  <select
                    name="status"
                    value={formFields.status}
                    onChange={handleInputChange}
                    className="cbts-form-input"
                    style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Fee Coverage Note */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065F46', fontSize: '0.82rem', fontWeight: 600 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
                <span>This fee applies uniformly to all 1st, 2nd, 3rd & 4th year students assigned to this bus.</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="cbts-btn cbts-btn-secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  style={{ padding: '0.6rem 1.25rem' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cbts-btn cbts-btn-primary"
                  disabled={submitting || buses.length === 0}
                  style={{ padding: '0.6rem 1.5rem', fontWeight: 700 }}
                >
                  {submitting ? 'Saving...' : editingFeeId ? 'Update Bus Fee' : 'Save Bus Fee'}
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

export default BusFeeManagement;
