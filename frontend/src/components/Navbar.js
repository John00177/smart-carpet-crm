import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS_BY_ROLE = {
  admin: [
    { to: '/', label: 'Dashboard' },
    { to: '/products', label: 'Products' },
    { to: '/transfers', label: 'Transfers' },
    { to: '/purchases', label: 'Purchases' },
    { to: '/sales', label: 'Sales' },
    { to: '/payments', label: 'Payments' },
  ],
  warehouse: [
    { to: '/', label: 'Dashboard' },
    { to: '/products', label: 'Products' },
    { to: '/transfers', label: 'Transfers' },
    { to: '/purchases', label: 'Purchases' },
  ],
  branch: [
    { to: '/', label: 'Dashboard' },
    { to: '/sales', label: 'My Sales' },
    { to: '/payments', label: 'My Payments' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const links = LINKS_BY_ROLE[user.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="navbar">
      <div className="brand">Smart Carpet CRM</div>
      <div className="links">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </div>
      <div className="user-info">
        <span>{user.name} ({user.role})</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
