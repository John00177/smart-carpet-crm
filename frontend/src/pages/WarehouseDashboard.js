import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money, qty } from '../utils/format';

export default function WarehouseDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showPurchase, setShowPurchase] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  function load() {
    api.get('/dashboard/warehouse')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }

  useEffect(load, []);

  if (error) return <Layout><div className="page-title">Warehouse Dashboard</div><div className="error-text">{error}</div></Layout>;
  if (!data) return <Layout><div className="loading-wrap">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-title">Warehouse Dashboard</div>

      <div className="cards-grid">
        {data.warehouses.map((w) => (
          <div className="card" key={w.id}>
            <div className="label">{w.name}</div>
            <div className="value">{qty(w.total_qty)}</div>
            <div className="sub">cost value {money(w.cost_value)}</div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => setShowPurchase(true)}>Record Purchase</button>
        <button className="btn secondary" onClick={() => setShowTransfer(true)}>Transfer Stock</button>
      </div>

      <div className="section">
        <div className="section-title">Central Warehouse Stock</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name (UZ)</th><th>Name (RU)</th><th>Size</th><th>Color</th><th>Cost</th><th>Sell</th><th>Qty</th></tr>
            </thead>
            <tbody>
              {data.central_stock.map((p) => (
                <tr key={p.id}>
                  <td>{p.name_uz}</td><td>{p.name_ru}</td><td>{p.size}</td><td>{p.color}</td>
                  <td>{money(p.cost_price)}</td><td>{money(p.sell_price)}</td><td>{p.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Today's Transfers</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>From</th><th>To</th><th>Items</th><th>Cost Value</th><th>By</th></tr>
            </thead>
            <tbody>
              {data.today_transfers.map((t) => (
                <tr key={t.id}>
                  <td>{t.fromWarehouse?.name}</td>
                  <td>{t.toWarehouse?.name}</td>
                  <td>{t.items?.map((i) => `${i.Product?.name_uz} x${i.quantity}`).join(', ')}</td>
                  <td>{money(t.total_cost)}</td>
                  <td>{t.creator?.name}</td>
                </tr>
              ))}
              {data.today_transfers.length === 0 && <tr><td colSpan={5}>No transfers today</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Today's Purchases</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Supplier</th><th>By</th></tr>
            </thead>
            <tbody>
              {data.today_purchases.map((p) => (
                <tr key={p.id}>
                  <td>{p.Product?.name_uz}</td><td>{p.quantity}</td><td>{money(p.unit_cost)}</td>
                  <td>{money(p.total_cost)}</td><td>{p.supplier || '-'}</td><td>{p.creator?.name}</td>
                </tr>
              ))}
              {data.today_purchases.length === 0 && <tr><td colSpan={6}>No purchases today</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showPurchase && <PurchaseModal onClose={() => setShowPurchase(false)} onSaved={() => { setShowPurchase(false); load(); }} />}
      {showTransfer && <TransferModal warehouses={data.warehouses} onClose={() => setShowTransfer(false)} onSaved={() => { setShowTransfer(false); load(); }} />}
    </Layout>
  );
}

function PurchaseModal({ onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', quantity: '', unit_cost: '', supplier: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.product_id || !form.quantity || !form.unit_cost) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/purchases', {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        unit_cost: Number(form.unit_cost),
        supplier: form.supplier,
        notes: form.notes,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record purchase');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Record Purchase from Manufacturer" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Product</label>
          <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz} ({p.size}, {p.color})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Unit Cost</label>
          <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Supplier</label>
          <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
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

function TransferModal({ warehouses, onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: '' }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  function updateItem(idx, field, value) {
    const copy = [...items];
    copy[idx][field] = value;
    setItems(copy);
  }
  function addItem() { setItems([...items, { product_id: '', quantity: '' }]); }
  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!from || !to || from === to) {
      setError('Select different source and destination warehouses');
      return;
    }
    const validItems = items.filter((i) => i.product_id && i.quantity);
    if (validItems.length === 0) {
      setError('Add at least one item');
      return;
    }
    setSaving(true);
    try {
      await api.post('/transfers', {
        from_warehouse_id: Number(from),
        to_warehouse_id: Number(to),
        notes,
        items: validItems.map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) })),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Transfer Stock" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>From Warehouse</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Select</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>To Warehouse</label>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Select</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <label>Items</label>
        {items.map((item, idx) => (
          <div className="transfer-items-row" key={idx}>
            <div className="form-group">
              <select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)}>
                <option value="">Product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz}</option>)}
              </select>
            </div>
            <div className="form-group">
              <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
            </div>
            {items.length > 1 && <button type="button" className="btn secondary" onClick={() => removeItem(idx)}>-</button>}
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={addItem} style={{ marginBottom: 14 }}>+ Add Item</button>
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
