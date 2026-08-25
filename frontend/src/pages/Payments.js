import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money, dateStr } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Payments() {
  const { user } = useAuth();
  const { t } = useLang();
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    api.get('/payments').then((res) => setPayments(res.data)).catch((err) => setError(err.response?.data?.error || t('failed_to_load')));
    if (user.role === 'admin') {
      api.get('/payments/debts/all').then((res) => setDebts(res.data)).catch(() => {});
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  return (
    <Layout>
      <div className="page-title">{user.role === 'branch' ? t('my_payments') : t('all_payments')}</div>
      <div className="btn-row">
        <button className="btn" onClick={() => setShowAdd(true)}>+ {t('record_payment')}</button>
      </div>
      {error && <div className="error-text">{error}</div>}

      {user.role === 'admin' && (
        <div className="section">
          <div className="section-title">{t('debt_summary')}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('branch')}</th><th>{t('total_given')}</th><th>{t('total_paid')}</th><th>{t('debt_remaining')}</th></tr></thead>
              <tbody>
                {debts.map((d) => (
                  <tr key={d.id}><td>{d.name}</td><td>{money(d.total_given)}</td><td>{money(d.total_paid)}</td><td>{money(d.debt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">{t('payment_history')}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('date')}</th>{user.role !== 'branch' && <th>{t('branch')}</th>}<th>{t('amount')}</th><th>{t('notes')}</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{dateStr(p.payment_date)}</td>
                  {user.role !== 'branch' && <td>{p.branch_id}</td>}
                  <td>{money(p.amount)}</td>
                  <td>{p.notes || '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4}>{t('no_payments_yet')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <PaymentModal isAdmin={user.role === 'admin'} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </Layout>
  );
}

function PaymentModal({ isAdmin, onClose, onSaved }) {
  const { t } = useLang();
  const [branchId, setBranchId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const branches = [
    { id: 1, name: 'Davronbek' }, { id: 2, name: 'Tursunboy' }, { id: 3, name: 'Globus' },
    { id: 4, name: 'Branch 4' }, { id: 5, name: 'Branch 5' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (isAdmin && !branchId) { setError(t('select_branch')); return; }
    if (!amount || Number(amount) <= 0) { setError(t('enter_valid_amount')); return; }
    setSaving(true);
    try {
      const payload = { amount: Number(amount), notes };
      if (isAdmin) payload.branch_id = Number(branchId);
      await api.post('/payments', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('failed_to_save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('record_payment')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {isAdmin && (
          <div className="form-group">
            <label>{t('branch')}</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t('select_branch')}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group"><label>{t('amount')}</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="form-group"><label>{t('notes')}</label><textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}
