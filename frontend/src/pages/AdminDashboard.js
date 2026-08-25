import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { money, qty } from '../utils/format';
import { useLang } from '../context/LangContext';

export default function AdminDashboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/admin')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load_dashboard')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <Layout><div className="page-title">{t('admin_dashboard')}</div><div className="error-text">{error}</div></Layout>;
  if (!data) return <Layout><div className="loading-wrap">{t('loading')}</div></Layout>;

  return (
    <Layout>
      <div className="page-title">{t('admin_dashboard')}</div>

      <div className="cards-grid">
        <div className="card">
          <div className="label">{t('total_carpets_all')}</div>
          <div className="value">{qty(data.total_carpets)}</div>
        </div>
        <div className="card">
          <div className="label">{t('total_cost_value')}</div>
          <div className="value">{money(data.total_cost_value)}</div>
        </div>
        <div className="card">
          <div className="label">{t('total_sell_value')}</div>
          <div className="value">{money(data.total_sell_value)}</div>
        </div>
        <div className="card">
          <div className="label">{t('total_branch_debt')}</div>
          <div className="value negative">{money(data.total_branch_debt)}</div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="label">{t('central_worth')}</div>
          <div className="value">{money(data.central_sell_value)}</div>
          <div className="sub">{qty(data.central_carpets)} {t('carpets_cost')} {money(data.central_cost_value)}</div>
        </div>
        <div className="card">
          <div className="label">{t('branch_worth')}</div>
          <div className="value">{money(data.branch_sell_value)}</div>
          <div className="sub">{qty(data.branch_carpets)} {t('carpets_cost')} {money(data.branch_cost_value)}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">{t('today')}</div>
        <div className="cards-grid">
          <div className="card">
            <div className="label">{t('income')}</div>
            <div className="value positive">{money(data.daily.income)}</div>
          </div>
          <div className="card">
            <div className="label">{t('outcome')}</div>
            <div className="value negative">{money(data.daily.outcome)}</div>
          </div>
          <div className="card">
            <div className="label">{t('net')}</div>
            <div className={`value ${data.daily.net >= 0 ? 'positive' : 'negative'}`}>{money(data.daily.net)}</div>
          </div>
          <div className="card">
            <div className="label">{t('transfers_out')}</div>
            <div className="value">{qty(data.daily.transfers_out_qty)}</div>
            <div className="sub">{money(data.daily.transfers_out_value)} {t('cost_value')}</div>
          </div>
          <div className="card">
            <div className="label">{t('purchases_in')}</div>
            <div className="value">{qty(data.daily.purchases_in_qty)}</div>
            <div className="sub">{money(data.daily.purchases_in_value)}</div>
          </div>
          <div className="card">
            <div className="label">{t('branch_sales_total')}</div>
            <div className="value">{money(data.daily.branch_sales)}</div>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="section" style={{ margin: 0 }}>
          <div className="section-title">{t('this_week')}</div>
          <div className="card">
            <div className="label">{t('net_income')}</div>
            <div className={`value ${data.weekly.net >= 0 ? 'positive' : 'negative'}`}>{money(data.weekly.net)}</div>
            <div className="sub">{money(data.weekly.income)} / {money(data.weekly.outcome)}</div>
          </div>
        </div>
        <div className="section" style={{ margin: 0 }}>
          <div className="section-title">{t('this_month')}</div>
          <div className="card">
            <div className="label">{t('net_income')}</div>
            <div className={`value ${data.monthly.net >= 0 ? 'positive' : 'negative'}`}>{money(data.monthly.net)}</div>
            <div className="sub">{money(data.monthly.income)} / {money(data.monthly.outcome)}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">{t('branch_debt_title')}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('branch')}</th>
                <th>{t('manager')}</th>
                <th>{t('total_given')}</th>
                <th>{t('total_paid')}</th>
                <th>{t('debt_remaining')}</th>
                <th>{t('progress')}</th>
              </tr>
            </thead>
            <tbody>
              {data.branch_debts.map((b) => {
                const pct = b.total_given > 0 ? Math.min(100, (b.total_paid / b.total_given) * 100) : 0;
                return (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.manager_name || '-'}</td>
                    <td>{money(b.total_given)}</td>
                    <td>{money(b.total_paid)}</td>
                    <td className={b.debt > 0 ? 'error-text' : ''}>{money(b.debt)}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
