import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonCards, SkeletonTable, EmptyState } from '../components/Skeleton';
import api from '../services/api';
import { formatMoney, formatQty, formatMeters, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { useLang } from '../context/LangContext';

export default function WarehouseDashboard() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPurchase, setShowPurchase] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/warehouse', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load_dashboard')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const name = (p) => (lang === 'ru' ? p.name_ru : p.name_uz);

  function itemLabel(item) {
    const p = item.Product;
    const label = p ? name(p) : '';
    return p && p.unit_type === 'meter'
      ? `${label} — ${formatMeters(item.meter_quantity)} ${t('meters').toLowerCase()}`
      : `${label} — ${formatQty(item.quantity)} ${t('pieces').toLowerCase()}`;
  }

  return (
    <Layout>
      <div className="page-title">{t('warehouse_dashboard')}</div>
      {error && <div className="error-text">{error}</div>}

      {loading && !data ? <SkeletonCards count={6} /> : data && (
        <div className="cards-grid">
          {data.warehouses.map((w) => (
            <div className="card" key={w.id}>
              <div className="label">{w.name}</div>
              <div className="value">{formatQty(w.total_qty)} <span className="unit">{t('pieces').toLowerCase()}</span></div>
              <div className="sub">
                {formatMeters(w.total_meters)} {t('meters').toLowerCase()} · {t('cost_value')} {formatMoney(w.cost_value)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="btn-row">
        <button className="btn" onClick={() => setShowPurchase(true)}>{t('record_purchase')}</button>
        <button className="btn secondary" onClick={() => setShowTransfer(true)}>{t('transfer_stock')}</button>
      </div>

      {data && (
        <div className="section">
          <div className="section-title">{t('central_stock_title')}</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('name_uz')}</th><th>{t('name_ru')}</th><th>{t('size')}</th><th>{t('color')}</th>
                  <th>{t('product_type')}</th><th>{t('qty')}</th>
                  <th>{t('cost')}</th><th>{t('sell')}</th>
                </tr>
              </thead>
              <tbody>
                {data.central_stock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name_uz}</td><td>{p.name_ru}</td><td>{p.size}</td><td>{p.color}</td>
                    <td>
                      <span className={`badge ${p.unit_type === 'meter' ? 'blue' : 'green'}`}>
                        {p.unit_type === 'meter' ? t('by_meter') : t('by_piece')}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {p.unit_type === 'meter'
                          ? `${formatMeters(p.meter_quantity)} ${t('meters').toLowerCase()}`
                          : `${formatQty(p.quantity)} ${t('pieces').toLowerCase()}`}
                      </strong>
                    </td>
                    <td>{formatMoney(p.cost_price)}</td><td>{formatMoney(p.sell_price)}</td>
                  </tr>
                ))}
                {data.central_stock.length === 0 && (
                  <tr><td colSpan={8}><EmptyState icon="📦" text={t('no_data')} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DateFilterBar value={filter} onChange={setFilter} />

      {loading && !data ? <SkeletonTable rows={4} cols={5} /> : data && (
        <>
          <div className="section">
            <div className="section-title">{t('nav_transfers')}</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>{t('date')}</th><th>{t('from')}</th><th>{t('to')}</th><th>{t('items')}</th><th>{t('cost_value')}</th><th>{t('by')}</th></tr>
                </thead>
                <tbody>
                  {data.transfers.map((tr) => (
                    <tr key={tr.id}>
                      <td>{dateStr(tr.transfer_date)}</td>
                      <td>{tr.fromWarehouse?.name}</td>
                      <td>{tr.toWarehouse?.name}</td>
                      <td>{tr.items?.map((i) => itemLabel(i)).join(', ')}</td>
                      <td>{formatMoney(tr.total_cost)}</td>
                      <td>{tr.creator?.name}</td>
                    </tr>
                  ))}
                  {data.transfers.length === 0 && (
                    <tr><td colSpan={6}><EmptyState icon="↔" text={t('no_transfers_yet')} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section">
            <div className="section-title">{t('nav_purchases')}</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>{t('date')}</th><th>{t('product')}</th><th>{t('qty')}</th><th>{t('unit_cost')}</th><th>{t('total')}</th><th>{t('supplier')}</th><th>{t('by')}</th></tr>
                </thead>
                <tbody>
                  {data.purchases.map((p) => (
                    <tr key={p.id}>
                      <td>{dateStr(p.purchase_date)}</td>
                      <td>{p.Product ? name(p.Product) : ''}</td>
                      <td>
                        {p.Product && p.Product.unit_type === 'meter'
                          ? `${formatMeters(p.meter_quantity)} ${t('meters').toLowerCase()}`
                          : `${formatQty(p.quantity)} ${t('pieces').toLowerCase()}`}
                      </td>
                      <td>{formatMoney(p.unit_cost)}</td>
                      <td>{formatMoney(p.total_cost)}</td>
                      <td>{p.supplier || '-'}</td>
                      <td>{p.creator?.name}</td>
                    </tr>
                  ))}
                  {data.purchases.length === 0 && (
                    <tr><td colSpan={7}><EmptyState icon="🧾" text={t('no_purchases_yet')} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showPurchase && (
        <PurchaseModal onClose={() => setShowPurchase(false)} onSaved={() => { setShowPurchase(false); load(); }} />
      )}
      {showTransfer && (
        <TransferModal warehouses={data ? data.warehouses : []} onClose={() => setShowTransfer(false)} onSaved={() => { setShowTransfer(false); load(); }} />
      )}
    </Layout>
  );
}

function PurchaseModal({ onClose, onSaved }) {
  const { t, lang } = useLang();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', amount: '', unit_cost: '', supplier: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  const selected = products.find((p) => String(p.id) === String(form.product_id));
  const isMeter = selected && selected.unit_type === 'meter';
  const total = Number(form.amount) * Number(form.unit_cost);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.product_id || !form.amount || !form.unit_cost) {
      setError(t('all_fields_required'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/purchases', {
        product_id: Number(form.product_id),
        amount: Number(form.amount),
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
          <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value, amount: '' })}>
            <option value="">{t('select')}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {(lang === 'ru' ? p.name_ru : p.name_uz)} ({p.size}, {p.color})
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="form-group">
            <label>{isMeter ? t('quantity_meters') : t('quantity_pcs')}</label>
            <input
              type="number" min={isMeter ? '0.01' : '1'} step={isMeter ? '0.01' : '1'}
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        )}
        <div className="form-group">
          <label>{t('unit_cost')}</label>
          <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
        </div>
        {total > 0 && (
          <div className="modal-total"><span>{t('total')}</span><strong>{formatMoney(total)}</strong></div>
        )}
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
  const { t, lang } = useLang();
  const [products, setProducts] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState([{ product_id: '', amount: '' }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  function productOf(productId) {
    return products.find((x) => String(x.id) === String(productId));
  }

  function updateItem(idx, field, value) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }
  function addItem() { setItems([...items, { product_id: '', amount: '' }]); }
  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!from || !to || from === to) {
      setError(t('select_different_warehouses'));
      return;
    }
    const validItems = items.filter((i) => i.product_id && i.amount);
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
        items: validItems.map((i) => ({
          product_id: Number(i.product_id),
          amount: Number(i.amount),
        })),
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
        <label className="group-label">{t('items')}</label>
        {items.map((item, idx) => {
          const product = productOf(item.product_id);
          const isMeter = product && product.unit_type === 'meter';
          return (
            <div className="transfer-items-row" key={idx}>
              <div className="form-group">
                <select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)}>
                  <option value="">{t('product')}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{lang === 'ru' ? p.name_ru : p.name_uz}</option>
                  ))}
                </select>
              </div>
              {product && (
                <div className="form-group">
                  <input
                    type="number" min={isMeter ? '0.01' : '1'} step={isMeter ? '0.01' : '1'}
                    placeholder={isMeter ? t('meters') : t('pieces')}
                    value={item.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                  />
                </div>
              )}
              {items.length > 1 && <button type="button" className="btn secondary" onClick={() => removeItem(idx)}>−</button>}
            </div>
          );
        })}
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
