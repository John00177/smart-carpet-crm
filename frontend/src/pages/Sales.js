import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money, dateStr } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    api.get('/sales').then((res) => setSales(res.data)).catch((err) => setError(err.response?.data?.error || 'Failed to load'));
  }
  useEffect(load, []);

  return (
    <Layout>
      <div className="page-title">{user.role === 'branch' ? 'My Sales' : 'All Sales'}</div>
      {user.role === 'branch' && (
        <div className="btn-row">
          <button className="btn" onClick={() => setShowAdd(true)}>+ Record Sale</button>
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th>{user.role !== 'branch' && <th>Branch</th>}<th>Product</th><th>Qty</th><th>Sell Price</th><th>Total</th><th>Customer</th></tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>{dateStr(s.sale_date)}</td>
                  {user.role !== 'branch' && <td>{s.branch_id}</td>}
                  <td>{s.Product?.name_uz}</td>
                  <td>{s.quantity}</td>
                  <td>{money(s.sell_price)}</td>
                  <td>{money(s.total_amount)}</td>
                  <td>{s.customer_name || '-'}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={7}>No sales yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <SaleModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
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
    <Modal title="Record Sale" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Product</label>
          <select value={form.product_id} onChange={(e) => onProductChange(e.target.value)}>
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Quantity</label><input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
        <div className="form-group"><label>Sell Price</label><input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} /></div>
        <div className="form-group"><label>Customer Name</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
