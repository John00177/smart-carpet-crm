import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonTable, EmptyState } from '../components/Skeleton';
import api from '../services/api';
import { formatMoney, formatQty, formatMeters, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Sales() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/sales', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setSales(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const name = (p) => (lang === 'ru' ? p.name_ru : p.name_uz);
  const total = sales.reduce((s, x) => s + Number(x.total_amount || 0), 0);

  function saleAmount(s) {
    const meter = s.Product && s.Product.unit_type === 'meter';
    return meter
      ? `${formatMeters(s.meter_quantity)} ${t('meters').toLowerCase()}`
      : `${formatQty(s.quantity)} ${t('pieces').toLowerCase()}`;
  }

  return (
    <Layout>
      <div className="page-title">{user.role === 'branch' ? t('my_sales') : t('all_sales')}</div>

      {user.role === 'branch' && (
        <div className="btn-row">
          <button className="btn" onClick={() => setShowAdd(true)}>+ {t('record_sale')}</button>
        </div>
      )}

      <DateFilterBar value={filter} onChange={setFilter} />
      {error && <div className="error-text">{error}</div>}

      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="section">
          <div className="section-title">
            <span>{user.role === 'branch' ? t('my_sales') : t('all_sales')}</span>
            <span className="section-total"><strong className="pos">{formatMoney(total)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  {user.role !== 'branch' && <th>{t('branch')}</th>}
                  <th>{t('product')}</th><th>{t('qty')}</th><th>{t('price')}</th>
                  <th>{t('total')}</th><th>{t('customer_name')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>{dateStr(s.sale_date)}</td>
                    {user.role !== 'branch' && <td>{s.branch_id}</td>}
                    <td>{s.Product ? name(s.Product) : ''}</td>
                    <td>{saleAmount(s)}</td>
                    <td>{formatMoney(s.sell_price)}</td>
                    <td>{formatMoney(s.total_amount)}</td>
                    <td>{s.customer_name || '-'}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={user.role !== 'branch' ? 7 : 6}><EmptyState icon="💵" text={t('no_sales_yet')} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <SaleModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </Layout>
  );
}

function SaleModal({ onClose, onSaved }) {
  const { t, lang } = useLang();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', amount: '', sell_price: '', customer_name: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  const selected = products.find((p) => String(p.id) === String(form.product_id));
  const isMeter = selected && selected.unit_type === 'meter';
  const amount = Number(form.amount) || 0;
  const total = amount * (Number(form.sell_price) || 0);

  function onProductChange(id) {
    const p = products.find((x) => String(x.id) === String(id));
    setForm({ ...form, product_id: id, amount: '', sell_price: p ? p.retail_price : form.sell_price });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.product_id || !form.amount || !form.sell_price) {
      setError(t('all_fields_required'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/sales', {
        product_id: Number(form.product_id),
        amount,
        sell_price: Number(form.sell_price),
        customer_name: form.customer_name,
        notes: form.notes,
      });
      onSaved();
    } catch (err) {
      const d = err.response?.data;
      if (d?.error === 'INSUFFICIENT_STOCK') {
        setError(`${t('insufficient_stock')} (${formatMeters(d.available_amount)} ${t('available')})`);
      } else {
        setError(d?.error || t('failed_to_save'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('record_sale')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('product')}</label>
          <select value={form.product_id} onChange={(e) => onProductChange(e.target.value)}>
            <option value="">{t('select')}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{lang === 'ru' ? p.name_ru : p.name_uz}</option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="form-group">
            <label>{isMeter ? t('sell_meters') : t('sell_pcs')}</label>
            <input
              type="number" min={isMeter ? '0.01' : '1'} step={isMeter ? '0.01' : '1'}
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        )}
        <div className="form-group">
          <label>{isMeter ? t('price_per_meter') : t('sell_price_unit')}</label>
          <input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
        </div>
        {total > 0 && (
          <div className="modal-total"><span>{t('total')}</span><strong>{formatMoney(total)}</strong></div>
        )}
        <div className="form-group"><label>{t('customer_name')}</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}
