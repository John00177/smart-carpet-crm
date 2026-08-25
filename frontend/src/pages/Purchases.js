import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { money, dateStr } from '../utils/format';
import { useLang } from '../context/LangContext';

export default function Purchases() {
  const { t } = useLang();
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/purchases').then((res) => setPurchases(res.data)).catch((err) => setError(err.response?.data?.error || t('failed_to_load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="page-title">{t('purchase_history')}</div>
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('date')}</th><th>{t('product')}</th><th>{t('qty')}</th><th>{t('unit_cost')}</th><th>{t('total')}</th><th>{t('supplier')}</th><th>{t('by')}</th></tr>
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
              {purchases.length === 0 && <tr><td colSpan={7}>{t('no_purchases_yet')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
