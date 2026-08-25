import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { money, qty } from '../utils/format';
import { useLang } from '../context/LangContext';

export default function WarehouseDashboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showPurchase, setShowPurchase] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  function load() {
    api.get('/dashboard/warehouse')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load_dashboard')));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  if (error) return <Layout><div className="page-title">{t('warehouse_dashboard')}</div><div className="error-text">{error}</div></Layout>;
  if (!data) return <Layout><div className="loading-wrap">{t('loading')}</div></Layout>;

  return (
    <Layout>
      <div className="page-title">{t('warehouse_dashboard')}</div>

      <div className="cards-grid">
        {data.warehouses.map((w) => (
          <div className="card" key={w.id}>
            <div className="label">{w.name}</div>
            <div className="value">{qty(w.total_qty)}</div>
            <div className="sub">{t('cost_value')} {money(w.cost_value)}</div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => setShowPurchase(true)}>{t('record_purchase')}</button>
        <button className="btn secondary" onClick={() => setShowTransfer(true)}>{t('transfer_stock')}</button>
      </div>

      <div className="section">
        <div className="section-title">{t('central_stock_title')}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('name_uz')}</th><th>{t('name_ru')}</th><th>{t('size')}</th><th>{t('color')}</th><th>{t('cost')}</th><th>{t('sell')}</th><th>{t('qty')}</th></tr>
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
        <div className="section-title">{t('todays_transfers')}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('from')}</th><th>{t('to')}</th><th>{t('items')}</th><th>{t('cost_value')}</th><th>{t('by')}</th></tr>
            </thead>
            <tbody>
              {data.today_transfers.map((tr) => (
                <tr key={tr.id}>
                  <td>{tr.fromWarehouse?.name}</td>
                  <td>{tr.toWarehouse?.name}</td>
                  <td>{tr.items?.map((i) => `${i.Product?.name_uz} x${i.quantity}`).join(', ')}</td>
                  <td>{money(tr.total_cost)}</td>
                  <td>{tr.creator?.name}</td>
                </tr>
              ))}
              {data.today_transfers.length === 0 && <tr><td colSpan={5}>{t('no_transfers_today')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-title">{t('todays_purchases')}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('product')}</th><th>{t('qty')}</th><th>{t('unit_cost')}</th><th>{t('total')}</th><th>{t('supplier')}</th><th>{t('by')}</th></tr>
            </thead>
            <tbody>
              {data.today_purchases.map((p) => (
                <tr key={p.id}>
                  <td>{p.Product?.name_uz}</td><td>{p.quantity}</td><td>{money(p.unit_cost)}</td>
                  <td>{money(p.total_cost)}</td><td>{p.supplier || '-'}</td><td>{p.creator?.name}</td>
                </tr>
              ))}
              {data.today_purchases.length === 0 && <tr><td colSpan={6}>{t('no_purchases_today')}</td></tr>}
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
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', quantity: '', unit_cost: '', supplier: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.product_id || !form.quantity || !form.unit_cost) {
      setError(t('all_fields_required'));
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
      setError(err.response?.data?.error || t('failed_to_save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('record_purchase_title')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('product')}</label>
          <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
            <option value="">{t('select')}</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz} ({p.size}, {p.color})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t('quantity')}</label>
          <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('unit_cost')}</label>
          <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('supplier')}</label>
          <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
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

function TransferModal({ warehouses, onClose, onSaved }) {
  const { t } = useLang();
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
      setError(t('select_different_warehouses'));
      return;
    }
    const validItems = items.filter((i) => i.product_id && i.quantity);
    if (validItems.length === 0) {
      setError(t('add_at_least_one_item'));
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
      setError(err.response?.data?.error || t('failed_to_save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('transfer_stock')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('from_warehouse')}</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">{t('select')}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t('to_warehouse')}</label>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">{t('select')}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 7, color: 'var(--color-text-muted)' }}>{t('items')}</label>
        {items.map((item, idx) => (
          <div className="transfer-items-row" key={idx}>
            <div className="form-group">
              <select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)}>
                <option value="">{t('product')}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name_uz}</option>)}
              </select>
            </div>
            <div className="form-group">
              <input type="number" min="1" placeholder={t('qty')} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
            </div>
            {items.length > 1 && <button type="button" className="btn secondary" onClick={() => removeItem(idx)}>-</button>}
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={addItem} style={{ marginBottom: 14 }}>+ {t('add_item')}</button>
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
