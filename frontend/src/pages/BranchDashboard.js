import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonCards, SkeletonTable, EmptyState } from '../components/Skeleton';
import { BarChart } from '../components/Charts';
import api from '../services/api';
import { formatMoney, formatQty, formatMeters, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { shortMonth } from '../constants/months';
import { useLang } from '../context/LangContext';

const SWATCHES = {
  red: '#b45050', blue: '#4a6fa5', green: '#4f8a6d', beige: '#c9b79a',
  brown: '#8a6b4f', gold: '#c9a96e', black: '#333b47', white: '#e6e9ee', grey: '#8b95a3', gray: '#8b95a3',
};
function swatchFor(color) {
  return SWATCHES[String(color || '').toLowerCase()] || 'var(--color-text-muted)';
}

export default function BranchDashboard() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [filter, setFilter] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSale, setShowSale] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/branch', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load_dashboard')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const chartData = data
    ? data.sales_series.map((p) => ({ label: bucketLabel(p.key, data.series_mode, lang), value: p.value }))
    : [];

  return (
    <Layout>
      {error && <div className="error-text">{error}</div>}

      {loading && !data ? (
        <>
          <SkeletonCards count={3} tall />
        </>
      ) : data && (
        <>
          <div className="branch-header">
            <div>
              <div className="branch-name"><span aria-hidden="true">📍</span> {data.warehouse.name}</div>
              <div className="exec-sub">{dateStr(data.range.startDate)} — {dateStr(data.range.endDate)}</div>
            </div>
            <div className={`debt-badge${data.debt.debt > 0 ? '' : ' clear'}`}>
              <span className="debt-badge-label">{t('debt_to_owner')}</span>
              <span className="debt-badge-value">{formatMoney(data.debt.debt)}</span>
            </div>
          </div>

          <div className="cards-grid">
            <div className="card branch-stat">
              <div className="stat-icon" aria-hidden="true">🏪</div>
              <div className="label">{t('my_stock')}</div>
              <div className="stat-value">{formatQty(data.stock.total_qty)} <span className="unit">{t('pieces').toLowerCase()}</span></div>
              <div className="sub">
                {formatMeters(data.stock.total_meters)} {t('meters').toLowerCase()} · {formatMoney(data.stock.sell_value)} {t('stock_worth')}
              </div>
            </div>

            <div className="card branch-stat warm">
              <div className="stat-icon" aria-hidden="true">💳</div>
              <div className="label">{t('debt_to_owner')}</div>
              <div className="stat-value gold">{formatMoney(data.debt.debt)}</div>
              <div className="sub">
                {t('given')} {formatMoney(data.debt.total_given)} · {t('paid')} {formatMoney(data.debt.total_paid)}
              </div>
            </div>

            <div className="card branch-stat">
              <div className="stat-icon" aria-hidden="true">💵</div>
              <div className="label">{t('my_sales_period')}</div>
              <div className="stat-value green">{formatMoney(data.range.sales_amount)}</div>
              <div className="sub">
                {formatQty(data.range.sales_qty)} {t('pieces').toLowerCase()} · {formatMeters(data.range.sales_meters)} {t('meters').toLowerCase()}
              </div>
            </div>

            <div
              className="card branch-stat expense-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/expenses')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/expenses'); } }}
            >
              <div className="stat-icon" aria-hidden="true">💸</div>
              <div className="label">{t('this_month_expenses')}</div>
              <div className="stat-value">{formatMoney(data.range.expenses_amount)}</div>
              <div className="sub">
                {t('net_profit')}:{' '}
                <strong className={data.range.net_profit >= 0 ? 'pos' : 'neg'}>
                  {formatMoney(data.range.net_profit)}
                </strong>
              </div>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={() => setShowSale(true)}>{t('record_sale')}</button>
            <button className="btn secondary" onClick={() => setShowPayment(true)}>{t('record_payment')}</button>
          </div>

          <DateFilterBar value={filter} onChange={setFilter} compact />

          <div className="branch-split">
            <div className="section">
              <div className="section-title">{t('my_stock')}</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('product')}</th><th>{t('size')}</th><th>{t('color')}</th>
                      <th>{t('qty')}</th><th>{t('sell')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stock_items.map((s) => (
                      <tr key={s.id}>
                        <td>{lang === 'ru' ? s.name_ru : s.name_uz}</td>
                        <td>{s.size}</td>
                        <td>
                          <span className="swatch" style={{ background: swatchFor(s.color) }} />
                          {s.color}
                        </td>
                        <td>
                          <strong>
                            {s.unit_type === 'meter'
                              ? `${formatMeters(s.meter_quantity)} ${t('meters').toLowerCase()}`
                              : `${formatQty(s.quantity)} ${t('pieces').toLowerCase()}`}
                          </strong>
                        </td>
                        <td>{formatMoney(s.sell_value)}</td>
                      </tr>
                    ))}
                    {data.stock_items.length === 0 && (
                      <tr><td colSpan={5}><EmptyState icon="🏪" text={t('no_data')} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section">
              <div className="section-title">{t('recent_activity')}</div>
              {data.activity.length === 0 ? (
                <EmptyState icon="🕐" text={t('no_activity_yet')} />
              ) : (
                <div className="timeline">
                  {data.activity.map((a) => (
                    <div className="timeline-item" key={a.id}>
                      <span className={`timeline-dot ${a.type}`} />
                      <div className="timeline-body">
                        <div className="timeline-text">
                          {a.type === 'transfer' && `${t('activity_received')} · ${activityAmount(a, t)}`}
                          {a.type === 'payment' && `${t('activity_paid')} · ${formatMoney(a.value)}`}
                          {a.type === 'sale' && `${t('activity_sold')} · ${activityAmount(a, t)} × ${a.product ? (lang === 'ru' ? a.product.name_ru : a.product.name_uz) : ''}`}
                        </div>
                        <div className="timeline-meta">
                          {dateStr(a.date)}
                          {a.type !== 'payment' && ` · ${formatMoney(a.value)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-title">{t('sales_performance')}</div>
            <BarChart data={chartData} height={170} accent="var(--color-success)" emptyText={t('no_data')} />
          </div>
        </>
      )}

      {loading && !data && <SkeletonTable rows={5} cols={5} />}

      {showSale && (
        <SaleModal
          stockItems={data ? data.stock_items : []}
          onClose={() => setShowSale(false)}
          onSaved={() => { setShowSale(false); load(); }}
        />
      )}
      {showPayment && <PaymentModal onClose={() => setShowPayment(false)} onSaved={() => { setShowPayment(false); load(); }} />}
    </Layout>
  );
}

function activityAmount(a, t) {
  const parts = [];
  if (a.qty > 0) parts.push(`${formatQty(a.qty)} ${t('pieces').toLowerCase()}`);
  if (a.meters > 0) parts.push(`${formatMeters(a.meters)} ${t('meters').toLowerCase()}`);
  return parts.join(' + ');
}

function bucketLabel(key, mode, lang) {
  if (mode === 'month') return shortMonth(key, lang);
  return String(Number(key.slice(8, 10)));
}

function SaleModal({ stockItems, onClose, onSaved }) {
  const { t, lang } = useLang();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', amount: '', sell_price: '', customer_name: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/products').then((res) => setProducts(res.data)); }, []);

  const selected = products.find((p) => String(p.id) === String(form.product_id));
  const isMeter = selected && selected.unit_type === 'meter';
  const inStock = stockItems.find((s) => String(s.id) === String(form.product_id));
  const available = inStock ? Number(isMeter ? inStock.meter_quantity : inStock.quantity) : 0;

  const amount = Number(form.amount) || 0;
  const total = amount * (Number(form.sell_price) || 0);
  const overStock = amount > available;

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
    if (overStock) {
      setError(t('insufficient_stock'));
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
    <Modal title={t('record_sale_title')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('product')}</label>
          <select value={form.product_id} onChange={(e) => onProductChange(e.target.value)}>
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
            <label>{isMeter ? t('sell_meters') : t('sell_pcs')}</label>
            <input
              type="number" min={isMeter ? '0.01' : '1'} step={isMeter ? '0.01' : '1'}
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <div className={`field-hint${overStock ? ' danger' : ''}`}>
              {isMeter ? formatMeters(available) : formatQty(available)} {(isMeter ? t('meters') : t('pieces')).toLowerCase()} {t('available')}
            </div>
          </div>
        )}
        <div className="form-group">
          <label>{isMeter ? t('price_per_meter') : t('sell_price_unit')}</label>
          <input type="number" min="0" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} />
        </div>
        {total > 0 && (
          <div className="modal-total"><span>{t('total')}</span><strong>{formatMoney(total)}</strong></div>
        )}
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
