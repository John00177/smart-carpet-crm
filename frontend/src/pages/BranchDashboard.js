import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money, qty, dateStr } from '../utils/format';
import { useLang } from '../context/LangContext';

export default function BranchDashboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showSale, setShowSale] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  function load() {
    api.get('/dashboard/branch')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load_dashboard')));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  if (error) return <Layout><div className="page-title">{t('nav_dashboard')}</div><div className="error-text">{error}</div></Layout>;
  if (!data) return <Layout><div className="loading-wrap">{t('loading')}</div></Layout>;

  return (
    <Layout>
      <div className="page-title">{data.warehouse.name}</div>

      <div className="cards-grid">
        <div className="card">
          <div className="label">{t('my_stock_qty')}</div>
          <div className="value">{qty(data.stock.total_qty)}</div>
          <div className="sub">{t('cost')} {money(data.stock.cost_value)} · {t('sell')} {money(data.stock.sell_value)}</div>
        </div>
        <div className="card">
          <div className="label">{t('my_debt')}</div>
          <div className="value negative">{money(data.debt.debt)}</div>
          <div className="sub">{t('given')} {money(data.debt.total_given)} · {t('paid')} {money(data.debt.total_paid)}</div>
        </div>
        <div className="card">
          <div className="label">{t('todays_sales')}</div>
          <div className="value">{money(data.sales.today.amount)}</div>
          <div className="sub">{qty(data.sales.today.qty)} {t('carpets')}</div>
        </div>
        <div className="card">
          <div className="label">{t('this_week')}</div>
          <div className="value">{money(data.sales.weekly.amount)}</div>
        </div>
        <div className="card">
          <div className="label">{t('this_month')}</div>
          <div className="value">{money(data.sales.monthly.amount)}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => setShowSale(true)}>{t('record_sale')}</button>
        <button className="btn secondary" onClick={() => setShowPayment(true)}>{t('record_payment')}</button>
      </div>

      <div className="section">
        <div className="section-title">{t('recent_transfers_received')}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('date')}</th><th>{t('items')}</th><th>{t('sell_value')}</th></tr></thead>
            <tbody>
              {data.recent_transfers.map((tr) => (
                <tr key={tr.id}>
                  <td>{dateStr(tr.transfer_date)}</td>
                  <td>{tr.items?.map((i) => `${i.Product?.name_uz} x${i.quantity}`).join(', ')}</td>
                  <td>{money(tr.total_sell_value)}</td>
                </tr>
              ))}
              {data.recent_transfers.length === 0 && <tr><td colSpan={3}>{t('no_transfers_yet')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">{t('recent_payments_made')}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('date')}</th><th>{t('amount')}</th><th>{t('notes')}</th></tr></thead>
            <tbody>
              {data.recent_payments.map((p) => (
                <tr key={p.id}><td>{dateStr(p.payment_date)}</td><td>{money(p.amount)}</td><td>{p.notes || '-'}</td></tr>
              ))}
              {data.recent_payments.length === 0 && <tr><td colSpan={3}>{t('no_payments_yet')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showSale && <SaleModal onClose={() => setShowSale(false)} onSaved={() => { setShowSale(false); load(); }} />}
      {showPayment && <PaymentModal onClose={() => setShowPayment(false)} onSaved={() => { setShowPayment(false); load(); }} />}
    </Layout>
  );
}

function SaleModal({ onClose, onSaved }) {
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', quantity: '', sell_price: '', customer_name: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  function onProductChange(id) {
    const p = products.find((x) => String(x.id) === String(id));
    setForm({ ...form, product_id: id, sell_price: p ? p.retail_price : form.sell_price });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.product_id || !form.quantity || !form.sell_price) {
      setError(t('all_fields_required'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/sales', {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        sell_price: Number(form.sell_price),
        customer_name: form.customer_name,
        notes: form.notes,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('failed_to_save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('record_sale_title')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('product')}</label>
          <select value={form.product_id} onChange={(e) => onProductChange(e.target.value)}>
            <option value="">{t('select')}</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz} ({p.size}, {p.color})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t('quantity')}</label>
          <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('sell_price_unit')}</label>
          <input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('customer_name')}</label>
          <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('notes')}</label>
          <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ onClose, onSaved }) {
  const { t } = useLang();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError(t('enter_valid_amount'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/payments', { amount: Number(amount), notes });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('failed_to_save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('record_payment_title')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('amount')}</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label>{t('notes')}</label>
          <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}
