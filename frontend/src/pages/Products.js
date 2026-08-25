import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/products').then((res) => setProducts(res.data)).catch((err) => setError(err.response?.data?.error || 'Failed to load'));
  }
  useEffect(load, []);

  async function handleDelete(id) {
    if (!window.confirm('Remove this product from the catalog?')) return;
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  }

  const canEdit = user.role === 'admin' || user.role === 'warehouse';

  return (
    <Layout>
      <div className="page-title">Carpet Catalog</div>
      {canEdit && (
        <div className="btn-row">
          <button className="btn" onClick={() => setShowAdd(true)}>+ Add Product</button>
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name (UZ)</th><th>Name (RU)</th><th>Size</th><th>Color</th>
                <th>Cost</th><th>Sell</th><th>Retail</th>
                {user.role === 'admin' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name_uz}</td><td>{p.name_ru}</td><td>{p.size}</td><td>{p.color}</td>
                  <td>{money(p.cost_price)}</td><td>{money(p.sell_price)}</td><td>{money(p.retail_price)}</td>
                  {user.role === 'admin' && (
                    <td><button className="btn secondary" onClick={() => handleDelete(p.id)}>Remove</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </Layout>
  );
}

function AddProductModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name_uz: '', name_ru: '', size: '', color: '', cost_price: '', sell_price: '', retail_price: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    for (const k of Object.keys(form)) {
      if (!form[k] && form[k] !== 0) { setError('All fields are required'); return; }
    }
    setSaving(true);
    try {
      await api.post('/products', {
        ...form,
        cost_price: Number(form.cost_price),
        sell_price: Number(form.sell_price),
        retail_price: Number(form.retail_price),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Product" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Name (Uzbek)</label><input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} /></div>
        <div className="form-group"><label>Name (Russian)</label><input value={form.name_ru} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} /></div>
        <div className="form-group"><label>Size</label><input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 2x3m" /></div>
        <div className="form-group"><label>Color</label><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        <div className="form-group"><label>Cost Price</label><input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
        <div className="form-group"><label>Sell Price (to branch)</label><input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} /></div>
        <div className="form-group"><label>Retail Price (to customer)</label><input type="number" min="0" step="0.01" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
