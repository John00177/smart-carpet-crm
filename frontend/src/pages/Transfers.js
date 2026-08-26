import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonTable, EmptyState } from '../components/Skeleton';
import api from '../services/api';
import { formatMoney, formatQty, formatMeters, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { useLang } from '../context/LangContext';

export default function Transfers() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/transfers', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setTransfers(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const name = (p) => (lang === 'ru' ? p.name_ru : p.name_uz);

  function itemLabel(i) {
    const p = i.Product;
    const label = p ? name(p) : '';
    return p && p.unit_type === 'meter'
      ? `${label} — ${formatMeters(i.meter_quantity)} ${t('meters').toLowerCase()}`
      : `${label} — ${formatQty(i.quantity)} ${t('pieces').toLowerCase()}`;
  }

  const totalCost = transfers.reduce((s, x) => s + Number(x.total_cost || 0), 0);
  const totalSell = transfers.reduce((s, x) => s + Number(x.total_sell_value || 0), 0);

  return (
    <Layout>
      <div className="page-title">{t('transfer_history')}</div>
      <DateFilterBar value={filter} onChange={setFilter} />
      {error && <div className="error-text">{error}</div>}

      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="section">
          <div className="section-title">
            <span>{t('transfer_history')}</span>
            <span className="section-total">
              {t('cost_value')} <strong>{formatMoney(totalCost)}</strong> · {t('sell_value')} <strong>{formatMoney(totalSell)}</strong>
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th><th>{t('from')}</th><th>{t('to')}</th><th>{t('items')}</th>
                  <th>{t('cost_value')}</th><th>{t('sell_value')}</th><th>{t('by')}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id}>
                    <td>{dateStr(tr.transfer_date)}</td>
                    <td>{tr.fromWarehouse?.name}</td>
                    <td>{tr.toWarehouse?.name}</td>
                    <td>{tr.items?.map((i) => itemLabel(i)).join(', ')}</td>
                    <td>{formatMoney(tr.total_cost)}</td>
                    <td>{formatMoney(tr.total_sell_value)}</td>
                    <td>{tr.creator?.name}</td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr><td colSpan={7}><EmptyState icon="↔" text={t('no_transfers_yet')} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
