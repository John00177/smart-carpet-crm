import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonTable, EmptyState } from '../components/Skeleton';
import api from '../services/api';
import { formatMoney, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Payments() {
  const { user } = useAuth();
  const { t } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/payments', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setPayments(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load')))
      .finally(() => setLoading(false));
    if (user.role === 'admin') {
      api.get('/payments/debts/all').then((res) => setDebts(res.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <Layout>
      <div className="page-title">{user.role === 'branch' ? t('my_payments') : t('all_payments')}</div>

      <div className="btn-row">
        <button className="btn" onClick={() => setShowAdd(true)}>+ {t('record_payment')}</button>
      </div>

      {user.role === 'admin' && debts.length > 0 && (
        <div className="section">
          <div className="section-title">{t('debt_summary')}</div>
          <div className="table-wrap">
            <table className="premium-table">
              <thead>
                <tr><th>{t('branch')}</th><th>{t('total_given')}</th><th>{t('total_paid')}</th><th>{t('debt_remaining')}</th></tr>
              </thead>
              <tbody>
                {debts.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{formatMoney(d.total_given)}</td>
                    <td>{formatMoney(d.total_paid)}</td>
                    <td className={d.debt > 0 ? 'neg' : ''}>{formatMoney(d.debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DateFilterBar value={filter} onChange={setFilter} />
      {error && <div className="error-text">{error}</div>}

      {loading ? <SkeletonTable rows={5} cols={4} /> : (
        <div className="section">
          <div className="section-title">
            <span>{t('payment_history')}</span>
            <span className="section-total"><strong className="pos">{formatMoney(total)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  {user.role !== 'branch' && <th>{t('branch')}</th>}
                  <th>{t('amount')}</th><th>{t('notes')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{dateStr(p.payment_date)}</td>
                    {user.role !== 'branch' && <td>{p.branch_id}</td>}
                    <td>{formatMoney(p.amount)}</td>
                    <td>{p.notes || '-'}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={user.role !== 'branch' ? 4 : 3}><EmptyState icon="💳" text={t('no_payments_yet')} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <PaymentModal isAdmin={user.role === 'admin'} branches={debts} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </Layout>
  );
}

function PaymentModal({ isAdmin, branches, onClose, onSaved }) {
  const { t } = useLang();
  const [branchId, setBranchId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState(branches || []);

  // The parent may not have the branch list yet when the modal opens.
  useEffect(() => {
    if (!isAdmin || (branches && branches.length)) return;
    api.get('/payments/debts/all').then((res) => setOptions(res.data)).catch(() => {});
  }, [isAdmin, branches]);

  useEffect(() => {
    if (branches && branches.length) setOptions(branches);
  }, [branches]);

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
              {options.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
