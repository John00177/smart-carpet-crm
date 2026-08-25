import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { money, dateStr } from '../utils/format';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/transfers').then((res) => setTransfers(res.data)).catch((err) => setError(err.response?.data?.error || 'Failed to load'));
  }, []);

  return (
    <Layout>
      <div className="page-title">Transfer History</div>
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>From</th><th>To</th><th>Items</th><th>Cost Value</th><th>Sell Value</th><th>By</th></tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td>{dateStr(t.transfer_date)}</td>
                  <td>{t.fromWarehouse?.name}</td>
                  <td>{t.toWarehouse?.name}</td>
                  <td>{t.items?.map((i) => `${i.Product?.name_uz} x${i.quantity}`).join(', ')}</td>
                  <td>{money(t.total_cost)}</td>
                  <td>{money(t.total_sell_value)}</td>
                  <td>{t.creator?.name}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={7}>No transfers yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
