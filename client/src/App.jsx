import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import StudentRegister from './pages/StudentRegister';
import StudentLogin from './pages/StudentLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import BusManagement from './pages/BusManagement';
import BusAssignment from './pages/BusAssignment';
import StudentDashboard from './pages/StudentDashboard';
import './App.css';

// Reusable themed placeholders for remaining registration pages (Parent & Management)
const RegisterPlaceholder = ({ roleName }) => {
  const navigate = useNavigate();
  return (
    <div className="cbts-landing-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>
      
      {/* Centered glass card */}
      <main className="cbts-main-content" style={{ padding: '2rem 1rem' }}>
        <div className="cbts-hero-card" style={{ padding: '3.5rem 2rem', maxWidth: '550px' }}>
          <h1 className="cbts-title-main" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Registration</h1>
          <h2 className="cbts-title-sub" style={{ fontSize: '1.4rem', color: 'var(--primary-navy)', marginBottom: '1.5rem' }}>
            {roleName} Portal
          </h2>
          <p style={{ color: 'var(--text-dark-secondary)', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
            You have successfully navigated to the <strong>{roleName}</strong> registration page. Form elements and registration workflows will be available here soon.
          </p>
          <button 
            className="cbts-btn cbts-btn-primary" 
            onClick={() => navigate('/choose-role')}
            style={{ width: '100%', maxWidth: '240px' }}
          >
            &larr; Back to Roles
          </button>
        </div>
      </main>
    </div>
  );
};

// Placeholder routes
const ParentRegister = () => <RegisterPlaceholder roleName="Parent" />;
const ManagementRegister = () => <RegisterPlaceholder roleName="College Management" />;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/choose-role" element={<RoleSelectionPage />} />
        <Route path="/register/student" element={<StudentRegister />} />
        <Route path="/register/parent" element={<ParentRegister />} />
        <Route path="/register/management" element={<ManagementRegister />} />
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bus-management" element={<BusManagement />} />
        <Route path="/admin/buses" element={<BusManagement />} />
        <Route path="/admin/bus-assignment" element={<BusAssignment />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
