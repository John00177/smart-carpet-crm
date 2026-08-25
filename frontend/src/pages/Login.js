import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('login_failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-top-controls">
        <button className="icon-btn" onClick={toggleTheme}>{theme === 'light' ? '☾' : '☀'}</button>
        <button className="icon-btn" onClick={toggleLang}>{lang === 'uz' ? 'UZ' : 'RU'}</button>
      </div>
      <div className="login-card">
        <h1>{t('app_name')}</h1>
        <div className="subtitle">{t('sign_in_subtitle')}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? t('signing_in') : t('sign_in')}
          </button>
        </form>
        <div className="demo-hints">
          <div className="demo-row"><span>{t('demo_admin')}</span><span>admin@smartcarpet.uz / admin123</span></div>
          <div className="demo-row"><span>{t('demo_warehouse')}</span><span>warehouse1@smartcarpet.uz / warehouse123</span></div>
          <div className="demo-row"><span>{t('demo_branch')}</span><span>branch1@smartcarpet.uz / branch123</span></div>
        </div>
      </div>
    </div>
  );
}
