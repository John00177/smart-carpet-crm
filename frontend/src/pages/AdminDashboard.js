import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonCards, SkeletonTable, EmptyState } from '../components/Skeleton';
import { BarChart, ProportionBar } from '../components/Charts';
import api from '../services/api';
import { formatMoney, formatQty, formatMeters, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { shortMonth } from '../constants/months';
import { useLang } from '../context/LangContext';

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/dashboard/admin', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load_dashboard')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const debts = data
    ? [...data.branch_debts].sort((a, b) => (sortDesc ? b.debt - a.debt : a.debt - b.debt))
    : [];


  const chartData = data
    ? data.cash_flow_series.flatMap((p) => ([
      { label: bucketLabel(p.key, data.series_mode, lang), value: p.income, color: 'var(--color-success)' },
      { label: '', value: p.outcome, color: 'var(--color-accent)' },
    ]))
    : [];

  return (
    <Layout>
      <div className="exec-header">
        <div className="page-title" style={{ marginBottom: 4 }}>{t('admin_dashboard')}</div>
        {data && <div className="exec-sub">{dateStr(data.range.startDate)} — {dateStr(data.range.endDate)}</div>}
      </div>

      {error && <div className="error-text">{error}</div>}

      {loading && !data ? <SkeletonCards count={4} tall /> : data && (
        <div className="cards-grid exec-stats">
          <StatCard icon="💰" label={t('total_stock_cost')} value={formatMoney(data.total_cost_value)}
            sub={`${formatMeters(data.total_meters)} ${t('meters')} · ${formatQty(data.total_carpets)} ${t('pieces')}`} />
          <StatCard icon="📈" label={t('total_stock_sell')} value={formatMoney(data.total_sell_value)} />
          <StatCard icon="🏦" label={t('total_branch_debt')} value={formatMoney(data.total_branch_debt)} tone="gold" />
          <StatCard icon="📊" label={t('potential_profit')} value={formatMoney(data.potential_profit)} tone="green" />
        </div>
      )}

      <DateFilterBar value={filter} onChange={setFilter} />

      {data && (
        <div className="exec-split">
          <div className="section">
            <div className="section-title">{t('stock_distribution')}</div>

            <div className="dist-row">
              <div className="dist-name">{t('central_warehouse')}</div>
              <div className="dist-nums">
                <span>{formatMeters(data.central_meters)} {t('meters')} · {formatQty(data.central_carpets)} {t('pieces')}</span>
                <strong>{formatMoney(data.central_sell_value)}</strong>
              </div>
            </div>
            <div className="dist-row">
              <div className="dist-name">{t('branch_warehouses')}</div>
              <div className="dist-nums">
                <span>{formatMeters(data.branch_meters)} {t('meters')} · {formatQty(data.branch_carpets)} {t('pieces')}</span>
                <strong>{formatMoney(data.branch_sell_value)}</strong>
              </div>
            </div>

            <div style={{ height: 18 }} />
            <ProportionBar segments={[
              { label: t('central_warehouse'), value: data.central_sell_value, color: 'var(--color-heading)' },
              { label: t('branch_warehouses'), value: data.branch_sell_value, color: 'var(--color-accent)' },
            ]} />

            <div className="exec-divider" />
            <div className="dist-row">
              <div className="dist-name">{t('profit')}</div>
              <div className="dist-nums">
                <strong className="pos">{formatMoney(data.potential_profit)}</strong>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">{t('cash_flow')}</div>
            <div className="flow-legend">
              <span><i className="dot" style={{ background: 'var(--color-success)' }} />{t('income')}: <strong>{formatMoney(data.range.income)}</strong></span>
              <span><i className="dot" style={{ background: 'var(--color-accent)' }} />{t('outcome')}: <strong>{formatMoney(data.range.outcome)}</strong></span>
            </div>
            <BarChart data={chartData} height={150} emptyText={t('no_data')} />
            <div className="exec-divider" />
            <div className="dist-row">
              <div className="dist-name">{t('net')}</div>
              <div className="dist-nums">
                <strong className={data.range.net >= 0 ? 'pos' : 'neg'}>{formatMoney(data.range.net)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && !data ? <SkeletonTable rows={5} cols={5} /> : data && (
        <div className="section">
          <div className="section-title">{t('branch_debt_title')}</div>
          <div className="table-wrap">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('branch')}</th>
                  <th>{t('manager')}</th>
                  <th>{t('total_given')}</th>
                  <th>{t('total_paid')}</th>
                  <th className="sortable" onClick={() => setSortDesc((s) => !s)}>
                    {t('debt_remaining')} {sortDesc ? '↓' : '↑'}
                  </th>
                  <th>{t('payment_progress')}</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((b) => {
                  const pct = b.total_given > 0 ? Math.min(100, (b.total_paid / b.total_given) * 100) : 0;
                  const isOpen = expanded === b.id;
                  return (
                    <React.Fragment key={b.id}>
                      <tr className="row-click" onClick={() => setExpanded(isOpen ? null : b.id)}>
                        <td><span className="row-caret">{isOpen ? '▾' : '▸'}</span>{b.name}</td>
                        <td>{b.manager_name || '-'}</td>
                        <td>{formatMoney(b.total_given)}</td>
                        <td>{formatMoney(b.total_paid)}</td>
                        <td className={b.debt > 0 ? 'neg' : ''}>{formatMoney(b.debt)}</td>
                        <td style={{ minWidth: 150 }}>
                          <div className="progress-bar-bg gold">
                            <div className="progress-bar-fill gold" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="expand-row">
                          <td colSpan={6}>
                            <div className="expand-grid">
                              <div>
                                <div className="expand-title">{t('recent_payments_made')}</div>
                                {b.recent_payments.length === 0
                                  ? <div className="expand-empty">{t('no_payments_yet')}</div>
                                  : b.recent_payments.map((p) => (
                                    <div className="expand-line" key={p.id}>
                                      <span>{dateStr(p.payment_date)}</span>
                                      <strong>{formatMoney(p.amount)}</strong>
                                    </div>
                                  ))}
                              </div>
                              <div>
                                <div className="expand-title">{t('recent_transfers_received')}</div>
                                {b.recent_transfers.length === 0
                                  ? <div className="expand-empty">{t('no_transfers_yet')}</div>
                                  : b.recent_transfers.map((tr) => (
                                    <div className="expand-line" key={tr.id}>
                                      <span>{dateStr(tr.transfer_date)} · {tr.items.map((i) => `${lang === 'ru' ? i.name_ru : i.name_uz} ×${i.quantity}`).join(', ')}</span>
                                      <strong>{formatMoney(tr.total_sell_value)}</strong>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {debts.length === 0 && (
                  <tr><td colSpan={6}><EmptyState icon="🏦" text={t('no_data')} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {data && (
        <div className="section">
          <div className="section-title">{t('movement_summary')}</div>
          <div className="cards-grid">
            <MiniStat label={t('transfers_out')} main={`${formatMeters(data.range.transfers_out_meters)} ${t('meters').toLowerCase()}`}
              sub={`${formatMoney(data.range.transfers_out_value)} ${t('cost_value')}`} />
            <MiniStat label={t('purchases_in')} main={`${formatQty(data.range.purchases_in_qty)} ${t('pieces').toLowerCase()}`}
              sub={formatMoney(data.range.purchases_in_value)} />
            <MiniStat label={t('branch_sales_total')} main={formatMoney(data.range.branch_sales)}
              sub={`${formatMeters(data.range.sales_meters)} ${t('meters').toLowerCase()}`} />
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ icon, label, value, sub, tone }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div className="label">{label}</div>
      <div className={`stat-value${tone ? ` ${tone}` : ''}`}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, main, sub }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{main}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function bucketLabel(key, mode, lang) {
  if (mode === 'month') return shortMonth(key, lang);
  return String(Number(key.slice(8, 10)));
}
