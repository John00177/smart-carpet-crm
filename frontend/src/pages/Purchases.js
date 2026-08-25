import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import DateFilterBar from '../components/DateFilterBar';
import { SkeletonTable, EmptyState } from '../components/Skeleton';
import api from '../services/api';
import { formatMoney, formatQty, dateStr } from '../utils/format';
import { defaultRange } from '../utils/dateRange';
import { useLang } from '../context/LangContext';

export default function Purchases() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState(defaultRange);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/purchases', { params: { startDate: filter.startDate, endDate: filter.endDate } })
      .then((res) => { setPurchases(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.error || t('failed_to_load')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate]);

  useEffect(load, [load]);

  const name = (p) => (lang === 'ru' ? p.name_ru : p.name_uz);
  const total = purchases.reduce((s, x) => s + Number(x.total_cost || 0), 0);
  const totalQty = purchases.reduce((s, x) => s + Number(x.quantity || 0), 0);

  return (
    <Layout>
      <div className="page-title">{t('purchase_history')}</div>
      <DateFilterBar value={filter} onChange={setFilter} />
      {error && <div className="error-text">{error}</div>}

      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="section">
          <div className="section-title">
            <span>{t('purchase_history')}</span>
            <span className="section-total">
              {formatQty(totalQty)} {t('carpets')} · <strong>{formatMoney(total)}</strong>
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th><th>{t('product')}</th><th>{t('qty')}</th>
                  <th>{t('unit_cost')}</th><th>{t('total')}</th><th>{t('supplier')}</th><th>{t('by')}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{dateStr(p.purchase_date)}</td>
                    <td>{p.Product ? name(p.Product) : ''}</td>
                    <td>{formatQty(p.quantity)}</td>
                    <td>{formatMoney(p.unit_cost)}</td>
                    <td>{formatMoney(p.total_cost)}</td>
                    <td>{p.supplier || '-'}</td>
                    <td>{p.creator?.name}</td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr><td colSpan={7}><EmptyState icon="🧾" text={t('no_purchases_yet')} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
