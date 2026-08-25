import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { money, dateStr } from '../utils/format';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/purchases').then((res) => setPurchases(res.data)).catch((err) => setError(err.response?.data?.error || 'Failed to load'));
  }, []);

  return (
    <Layout>
      <div className="page-title">Purchase History</div>
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Supplier</th><th>By</th></tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{dateStr(p.purchase_date)}</td>
                  <td>{p.Product?.name_uz}</td>
                  <td>{p.quantity}</td>
                  <td>{money(p.unit_cost)}</td>
                  <td>{money(p.total_cost)}</td>
                  <td>{p.supplier || '-'}</td>
                  <td>{p.creator?.name}</td>
                </tr>
              ))}
              {purchases.length === 0 && <tr><td colSpan={7}>No purchases yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
