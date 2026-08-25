import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';
import BranchDashboard from './pages/BranchDashboard';
import Products from './pages/Products';
import Transfers from './pages/Transfers';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Payments from './pages/Payments';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-wrap">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'warehouse') return <WarehouseDashboard />;
  if (user.role === 'branch') return <BranchDashboard />;
  return null;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute roles={['admin', 'warehouse']}><Products /></PrivateRoute>} />
      <Route path="/transfers" element={<PrivateRoute roles={['admin', 'warehouse']}><Transfers /></PrivateRoute>} />
      <Route path="/purchases" element={<PrivateRoute roles={['admin', 'warehouse']}><Purchases /></PrivateRoute>} />
      <Route path="/sales" element={<PrivateRoute roles={['admin', 'branch']}><Sales /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute roles={['admin', 'branch']}><Payments /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
