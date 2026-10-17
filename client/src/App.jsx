import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import StudentRegister from './pages/StudentRegister';
import ParentRegister from './pages/ParentRegister';
import StudentLogin from './pages/StudentLogin';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import BusManagement from './pages/BusManagement';
import BusAssignment from './pages/BusAssignment';
import BusFeeManagement from './pages/BusFeeManagement';
import AdminBusTracking from './pages/AdminBusTracking';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/choose-role" element={<RoleSelectionPage />} />
        <Route path="/register/student" element={<StudentRegister />} />
        <Route path="/register/parent" element={<ParentRegister />} />
        <Route path="/register/admin" element={<AdminRegister />} />
        <Route path="/register/management" element={<AdminRegister />} />
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/login/parent" element={<StudentLogin />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bus-management" element={<BusManagement />} />
        <Route path="/admin/buses" element={<BusManagement />} />
        <Route path="/admin/bus-assignment" element={<BusAssignment />} />
        <Route path="/admin/bus-fees" element={<BusFeeManagement />} />
        <Route path="/admin/fee-management" element={<BusFeeManagement />} />
        <Route path="/admin/track-bus" element={<AdminBusTracking />} />
        <Route path="/admin/tracking" element={<AdminBusTracking />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
