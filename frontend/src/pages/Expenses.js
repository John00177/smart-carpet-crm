import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonCards, SkeletonTable, EmptyState, Skeleton } from '../components/Skeleton';
import { RevenueExpensesChart, DonutChart } from '../components/Charts';
import { expenseAPI } from '../services/api';
import { formatMoney, dateStr } from '../utils/format';
import { defaultRange, daysBetween, todayStr } from '../utils/dateRange';
import { EXPENSE_CATEGORIES, categoryMeta } from '../constants/expenseCategories';
import { shortMonth } from '../constants/months';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Expenses() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [breakdown, setBreakdown] = useState({ total: 0, categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const isAdmin = user.role === 'admin';

  const load = useCallback(() => {
    setLoading(true);
    const params = { startDate: filter.startDate, endDate: filter.endDate };
    Promise.all([
      expenseAPI.getAll(params),
      expenseAPI.getSummary(params),
      expenseAPI.getCategoryBreakdown(params),
    ])
      .then(([a, b, c]) => {
        setRows(a.data);
        setSummary(b.data);
        setBreakdown(c.data);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  async function handleDelete(id) {
    if (!window.confirm(t('confirm_delete_expense'))) return;
    try {
      await expenseAPI.remove(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('failed_to_delete'));
    }
  }

  const total = breakdown.total || 0;
  const biggest = breakdown.categories && breakdown.categories.length ? breakdown.categories[0] : null;
  const days = Math.max(1, daysBetween(filter.startDate, filter.endDate));
  const avgDaily = total / days;

  const chartData = summary.map((m) => ({
    label: shortMonth(m.month, lang),
    revenue: m.revenue,
    expenses: m.expenses,
    net: m.net,
  }));

  const donutSegments = (breakdown.categories || []).map((c) => ({
    label: t(c.category),
    value: c.amount,
    percentage: c.percentage,
    color: categoryMeta(c.category).color,
  }));

  return (
    <Layout>
      <div className="exec-header">
        <div className="page-title" style={{ marginBottom: 4 }}>{t('expenses')}</div>
        <div className="exec-sub">{dateStr(filter.startDate)} — {dateStr(filter.endDate)}</div>
      </div>

      {!isAdmin && (
        <div className="btn-row">
          <button className="btn" onClick={() => setShowAdd(true)}>+ {t('add_expense')}</button>
        </div>
      )}

      <DateFilterBar value={filter} onChange={setFilter} />
      {error && <div className="error-text">{error}</div>}

      {loading ? <SkeletonCards count={3} tall /> : (
        <div className="cards-grid">
          <div className="card stat-card">
            <div className="stat-icon" aria-hidden="true">💸</div>
            <div className="label">{t('total_expenses')}</div>
            <div className="stat-value">{formatMoney(total)}</div>
            <div className="sub">{rows.length} {t('entries')}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" aria-hidden="true">{biggest ? categoryMeta(biggest.category).icon : '📦'}</div>
            <div className="label">{t('biggest_category')}</div>
            <div className="stat-value">{biggest ? t(biggest.category) : '—'}</div>
            {biggest && <div className="sub">{formatMoney(biggest.amount)} · {biggest.percentage}%</div>}
          </div>
          <div className="card stat-card">
            <div className="stat-icon" aria-hidden="true">📅</div>
            <div className="label">{t('avg_daily_expense')}</div>
            <div className="stat-value">{formatMoney(avgDaily)}</div>
            <div className="sub">{days} {t('days_short')}</div>
          </div>
        </div>
      )}

      <div className="exec-split">
        <div className="section">
          <div className="section-title">{t('revenue_vs_expenses')}</div>
          {loading
            ? <Skeleton height={210} radius={10} />
            : (
              <RevenueExpensesChart
                data={chartData}
                labels={{ revenue: t('revenue'), expenses: t('expenses'), net: t('net_profit') }}
                emptyText={t('no_data')}
              />
            )}
        </div>

        <div className="section">
          <div className="section-title">{t('expense_by_category')}</div>
          {loading
            ? <Skeleton height={190} radius={10} />
            : (
              <DonutChart
                segments={donutSegments}
                total={total}
                centerLabel={t('total_expenses')}
                emptyText={t('no_expenses_yet')}
              />
            )}
        </div>
      </div>

      {loading ? <SkeletonTable rows={5} cols={5} /> : (
        <div className="section">
          <div className="section-title">
            <span>{t('expenses')}</span>
            <span className="section-total"><strong className="neg">{formatMoney(total)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  {isAdmin && <th>{t('branch')}</th>}
                  <th>{t('category')}</th>
                  <th>{t('description')}</th>
                  <th>{t('amount')}</th>
                  {!isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const meta = categoryMeta(e.category);
                  return (
                    <tr key={e.id}>
                      <td>{dateStr(e.expense_date)}</td>
                      {isAdmin && <td>{e.branch_name || e.branch_id}</td>}
                      <td>
                        <span className="cat-tag" style={{ background: `${meta.color}1f`, color: meta.color }}>
                          <span aria-hidden="true">{meta.icon}</span>{t(e.category)}
                        </span>
                      </td>
                      <td>{e.description || '-'}</td>
                      <td>{formatMoney(e.amount)}</td>
                      {!isAdmin && (
                        <td>
                          <button className="btn secondary btn-sm" onClick={() => handleDelete(e.id)}>
                            {t('remove')}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 6}>
                      <EmptyState icon="💸" text={t('no_expenses_yet')} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <ExpenseModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
    </Layout>
  );
}

function ExpenseModal({ onClose, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    category: '', amount: '', expense_date: todayStr(), description: '', notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.category || !form.amount) {
      setError(t('all_fields_required'));
      return;
    }
    if (Number(form.amount) <= 0) {
      setError(t('enter_valid_amount'));
      return;
    }
    setSaving(true);
    try {
      await expenseAPI.create({
        category: form.category,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        description: form.description,
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
    <Modal title={t('add_expense')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('category')}</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">{t('select')}</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.icon} {t(c.key)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t('amount')}</label>
          <input type="number" min="0.01" step="0.01" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('date')}</label>
          <input type="date" value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('description')}</label>
          <input type="text" maxLength={255} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{t('notes')}</label>
          <textarea rows="2" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
