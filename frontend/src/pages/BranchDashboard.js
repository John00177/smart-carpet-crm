import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money, qty, dateStr } from '../utils/format';

export default function BranchDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showSale, setShowSale] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  function load() {
    api.get('/dashboard/branch')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }

  useEffect(load, []);

  if (error) return <Layout><div className="page-title">Branch Dashboard</div><div className="error-text">{error}</div></Layout>;
  if (!data) return <Layout><div className="loading-wrap">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-title">{data.warehouse.name}</div>

      <div className="cards-grid">
        <div className="card">
          <div className="label">My Stock (Qty)</div>
          <div className="value">{qty(data.stock.total_qty)}</div>
          <div className="sub">cost {money(data.stock.cost_value)} · sell {money(data.stock.sell_value)}</div>
        </div>
        <div className="card">
          <div className="label">My Debt</div>
          <div className="value negative">{money(data.debt.debt)}</div>
          <div className="sub">given {money(data.debt.total_given)} · paid {money(data.debt.total_paid)}</div>
        </div>
        <div className="card">
          <div className="label">Today's Sales</div>
          <div className="value">{money(data.sales.today.amount)}</div>
          <div className="sub">{qty(data.sales.today.qty)} carpets</div>
        </div>
        <div className="card">
          <div className="label">This Week</div>
          <div className="value">{money(data.sales.weekly.amount)}</div>
        </div>
        <div className="card">
          <div className="label">This Month</div>
          <div className="value">{money(data.sales.monthly.amount)}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => setShowSale(true)}>Record Sale</button>
        <button className="btn secondary" onClick={() => setShowPayment(true)}>Record Payment</button>
      </div>

      <div className="section">
        <div className="section-title">Recent Transfers Received</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Items</th><th>Sell Value</th></tr></thead>
            <tbody>
              {data.recent_transfers.map((t) => (
                <tr key={t.id}>
                  <td>{dateStr(t.transfer_date)}</td>
                  <td>{t.items?.map((i) => `${i.Product?.name_uz} x${i.quantity}`).join(', ')}</td>
                  <td>{money(t.total_sell_value)}</td>
                </tr>
              ))}
              {data.recent_transfers.length === 0 && <tr><td colSpan={3}>No transfers yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Recent Payments Made</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Notes</th></tr></thead>
            <tbody>
              {data.recent_payments.map((p) => (
                <tr key={p.id}><td>{dateStr(p.payment_date)}</td><td>{money(p.amount)}</td><td>{p.notes || '-'}</td></tr>
              ))}
              {data.recent_payments.length === 0 && <tr><td colSpan={3}>No payments yet</td></tr>}
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
      setError('All fields are required');
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
      setError(err.response?.data?.error || 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Record Sale to Customer" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Product</label>
          <select value={form.product_id} onChange={(e) => onProductChange(e.target.value)}>
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz} ({p.size}, {p.color})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Sell Price (per unit)</label>
          <input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Customer Name</label>
          <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/payments', { amount: Number(amount), notes });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Record Payment to Rich Man" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Amount</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
