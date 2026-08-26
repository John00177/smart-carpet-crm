import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import { EmptyState } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Products() {
  const { user } = useAuth();
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/products').then((res) => setProducts(res.data)).catch((err) => setError(err.response?.data?.error || t('failed_to_load')));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  async function handleDelete(id) {
    if (!window.confirm(t('confirm_remove_product'))) return;
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('failed_to_delete'));
    }
  }

  const canEdit = user.role === 'admin' || user.role === 'warehouse';

  return (
    <Layout>
      <div className="page-title">{t('carpet_catalog')}</div>
      {canEdit && (
        <div className="btn-row">
          <button className="btn" onClick={() => setShowAdd(true)}>+ {t('add_product')}</button>
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('name_uz')}</th><th>{t('name_ru')}</th><th>{t('size')}</th><th>{t('color')}</th>
                <th>{t('product_type')}</th>
                <th>{t('cost')}</th><th>{t('sell')}</th><th>{t('retail')}</th>
                {user.role === 'admin' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name_uz}</td><td>{p.name_ru}</td><td>{p.size}</td><td>{p.color}</td>
                  <td>
                    <span className={`badge ${p.unit_type === 'meter' ? 'blue' : 'green'}`}>
                      {p.unit_type === 'meter' ? t('by_meter') : t('by_piece')}
                    </span>
                  </td>
                  <td>{formatMoney(p.cost_price)}</td><td>{formatMoney(p.sell_price)}</td><td>{formatMoney(p.retail_price)}</td>
                  {user.role === 'admin' && (
                    <td><button className="btn secondary" onClick={() => handleDelete(p.id)}>{t('remove')}</button></td>
                  )}
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={user.role === 'admin' ? 9 : 8}><EmptyState icon="🧶" text={t('no_data')} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </Layout>
  );
}

function AddProductModal({ onClose, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    name_uz: '', name_ru: '', size: '', color: '',
    cost_price: '', sell_price: '', retail_price: '', unit_type: 'piece',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    for (const k of Object.keys(form)) {
      if (!form[k] && form[k] !== 0) { setError(t('all_fields_required')); return; }
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
      setError(err.response?.data?.error || t('failed_to_save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('add_product')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>{t('name_uz')}</label><input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} /></div>
        <div className="form-group"><label>{t('name_ru')}</label><input value={form.name_ru} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} /></div>
        <div className="form-group"><label>{t('size')}</label><input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 2x3m" /></div>
        <div className="form-group"><label>{t('color')}</label><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        <div className="form-group">
          <label>{t('product_type')}</label>
          <select value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })}>
            <option value="piece">{t('by_piece')}</option>
            <option value="meter">{t('by_meter')}</option>
          </select>
        </div>
        <div className="form-group"><label>{t('cost_price')}</label><input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
        <div className="form-group"><label>{t('sell_price_branch')}</label><input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} /></div>
        <div className="form-group"><label>{t('retail_price_customer')}</label><input type="number" min="0" step="0.01" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}
