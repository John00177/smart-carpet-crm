import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';

function getNavLinks(role, t) {
  const linksByRole = {
    // The owner deliberately does not see the carpet catalogue or branch
    // expenses — expenses are private to each branch.
    admin: [
      { to: '/', label: t('nav_dashboard') },
      { to: '/transfers', label: t('nav_transfers') },
      { to: '/purchases', label: t('nav_purchases') },
      { to: '/sales', label: t('nav_sales') },
      { to: '/payments', label: t('nav_payments') },
    ],
    warehouse: [
      { to: '/', label: t('nav_dashboard') },
      { to: '/products', label: t('nav_products') },
      { to: '/transfers', label: t('nav_transfers') },
      { to: '/purchases', label: t('nav_purchases') },
    ],
    branch: [
      { to: '/', label: t('nav_dashboard') },
      { to: '/sales', label: t('nav_my_sales') },
      { to: '/payments', label: t('nav_my_payments') },
      { to: '/expenses', label: t('expenses') },
    ],
  };
  return linksByRole[role] || [];
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  return (
    <button className="icon-btn" onClick={toggleTheme} title={theme === 'light' ? t('dark_mode') : t('light_mode')}>
      {theme === 'light' ? '☾' : '☀'}
    </button>
  );
}

function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <button className="icon-btn" onClick={toggleLang}>
      {lang === 'uz' ? 'UZ' : 'RU'}
    </button>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  if (!user) return null;
  const links = getNavLinks(user.role, t);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <div className="sidebar">
        <div className="brand">{t('app_name')}</div>
        <div className="links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="controls-row">
            <ThemeToggle />
            <LangToggle />
          </div>
          <div className="user-info">
            <strong>{user.name}</strong>
            {t(`role_${user.role}`)}
          </div>
          <button className="logout-btn-sidebar" onClick={handleLogout}>{t('logout')}</button>
        </div>
      </div>

      <div className="topbar">
        <div className="brand">{t('app_name')}</div>
        <div className="controls-row" style={{ padding: 0 }}>
          <ThemeToggle />
          <LangToggle />
          <button className="icon-btn" onClick={handleLogout}>{t('logout')}</button>
        </div>
      </div>
      <div className="topbar-links">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}
