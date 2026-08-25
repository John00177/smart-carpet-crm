import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { money, dateStr } from '../utils/format';
import { useLang } from '../context/LangContext';

export default function Transfers() {
  const { t } = useLang();
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/transfers').then((res) => setTransfers(res.data)).catch((err) => setError(err.response?.data?.error || t('failed_to_load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="page-title">{t('transfer_history')}</div>
      {error && <div className="error-text">{error}</div>}
      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t('date')}</th><th>{t('from')}</th><th>{t('to')}</th><th>{t('items')}</th><th>{t('cost_value')}</th><th>{t('sell_value')}</th><th>{t('by')}</th></tr>
            </thead>
            <tbody>
              {transfers.map((tr) => (
                <tr key={tr.id}>
                  <td>{dateStr(tr.transfer_date)}</td>
                  <td>{tr.fromWarehouse?.name}</td>
                  <td>{tr.toWarehouse?.name}</td>
                  <td>{tr.items?.map((i) => `${i.Product?.name_uz} x${i.quantity}`).join(', ')}</td>
                  <td>{money(tr.total_cost)}</td>
                  <td>{money(tr.total_sell_value)}</td>
                  <td>{tr.creator?.name}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={7}>{t('no_transfers_yet')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
