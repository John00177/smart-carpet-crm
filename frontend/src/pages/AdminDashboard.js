import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { money, qty } from '../utils/format';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/admin')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }, []);

  if (error) return <Layout><div className="page-title">Admin Dashboard</div><div className="error-text">{error}</div></Layout>;
  if (!data) return <Layout><div className="loading-wrap">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="page-title">Admin Dashboard</div>

      <div className="cards-grid">
        <div className="card">
          <div className="label">Total Carpets (All Warehouses)</div>
          <div className="value">{qty(data.total_carpets)}</div>
        </div>
        <div className="card">
          <div className="label">Total Cost Value</div>
          <div className="value">{money(data.total_cost_value)}</div>
        </div>
        <div className="card">
          <div className="label">Total Sell Value</div>
          <div className="value">{money(data.total_sell_value)}</div>
        </div>
        <div className="card">
          <div className="label">Total Branch Debt</div>
          <div className="value negative">{money(data.total_branch_debt)}</div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="label">Central Warehouse Worth</div>
          <div className="value">{money(data.central_sell_value)}</div>
          <div className="sub">{qty(data.central_carpets)} carpets · cost {money(data.central_cost_value)}</div>
        </div>
        <div className="card">
          <div className="label">Branch Warehouses Worth</div>
          <div className="value">{money(data.branch_sell_value)}</div>
          <div className="sub">{qty(data.branch_carpets)} carpets · cost {money(data.branch_cost_value)}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Today</div>
        <div className="cards-grid">
          <div className="card">
            <div className="label">Income (Payments Received)</div>
            <div className="value positive">{money(data.daily.income)}</div>
          </div>
          <div className="card">
            <div className="label">Outcome (Paid to Manufacturer)</div>
            <div className="value negative">{money(data.daily.outcome)}</div>
          </div>
          <div className="card">
            <div className="label">Net</div>
            <div className={`value ${data.daily.net >= 0 ? 'positive' : 'negative'}`}>{money(data.daily.net)}</div>
          </div>
          <div className="card">
            <div className="label">Transfers Out</div>
            <div className="value">{qty(data.daily.transfers_out_qty)}</div>
            <div className="sub">{money(data.daily.transfers_out_value)} cost value</div>
          </div>
          <div className="card">
            <div className="label">Purchases In</div>
            <div className="value">{qty(data.daily.purchases_in_qty)}</div>
            <div className="sub">{money(data.daily.purchases_in_value)}</div>
          </div>
          <div className="card">
            <div className="label">Branch Sales Total</div>
            <div className="value">{money(data.daily.branch_sales)}</div>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="section" style={{ margin: 0 }}>
          <div className="section-title">This Week</div>
          <div className="card">
            <div className="label">Net Income</div>
            <div className={`value ${data.weekly.net >= 0 ? 'positive' : 'negative'}`}>{money(data.weekly.net)}</div>
            <div className="sub">In {money(data.weekly.income)} · Out {money(data.weekly.outcome)}</div>
          </div>
        </div>
        <div className="section" style={{ margin: 0 }}>
          <div className="section-title">This Month</div>
          <div className="card">
            <div className="label">Net Income</div>
            <div className={`value ${data.monthly.net >= 0 ? 'positive' : 'negative'}`}>{money(data.monthly.net)}</div>
            <div className="sub">In {money(data.monthly.income)} · Out {money(data.monthly.outcome)}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Branch Debt</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Manager</th>
                <th>Total Given</th>
                <th>Total Paid</th>
                <th>Debt Remaining</th>
                <th>Progress</th>
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
