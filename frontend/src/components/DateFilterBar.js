import React, { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { rangeForPreset, defaultRange } from '../utils/dateRange';

const QUICK = [
  { key: 'today', label: 'filter_today' },
  { key: 'week', label: 'filter_week' },
  { key: 'month', label: 'filter_month' },
  { key: 'year', label: 'filter_year' },
  { key: 'custom', label: 'filter_custom' },
];

/**
 * Premium date range filter.
 *
 * value:    { preset, startDate, endDate }
 * onChange: called with a new value object whenever the effective range changes.
 *           Quick presets apply immediately; "custom" applies on Apply.
 */
export default function DateFilterBar({ value, onChange, compact = false }) {
  const { t } = useLang();
  const [draftStart, setDraftStart] = useState(value.startDate);
  const [draftEnd, setDraftEnd] = useState(value.endDate);

  useEffect(() => {
    setDraftStart(value.startDate);
    setDraftEnd(value.endDate);
  }, [value.startDate, value.endDate]);

  function selectPreset(key) {
    if (key === 'custom') {
      onChange({ ...value, preset: 'custom' });
      return;
    }
    onChange({ preset: key, ...rangeForPreset(key) });
  }

  function applyCustom() {
    if (!draftStart || !draftEnd) return;
    const start = draftStart <= draftEnd ? draftStart : draftEnd;
    const end = draftStart <= draftEnd ? draftEnd : draftStart;
    onChange({ preset: 'custom', startDate: start, endDate: end });
  }

  function reset() {
    onChange(defaultRange());
  }

  const isCustom = value.preset === 'custom';

  return (
    <div className={`filter-bar${compact ? ' compact' : ''}`}>
      <div className="filter-bar-label">{t('period')}</div>

      <div className="filter-chips">
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            className={`filter-chip${value.preset === q.key ? ' active' : ''}`}
            onClick={() => selectPreset(q.key)}
          >
            {t(q.label)}
          </button>
        ))}
      </div>

      {isCustom && (
        <div className="filter-range">
          <div className="filter-date">
            <label>{t('from_date')}</label>
            <input type="date" value={draftStart || ''} max={draftEnd || undefined}
              onChange={(e) => setDraftStart(e.target.value)} />
          </div>
          <span className="filter-arrow" aria-hidden="true">→</span>
          <div className="filter-date">
            <label>{t('to_date')}</label>
            <input type="date" value={draftEnd || ''} min={draftStart || undefined}
              onChange={(e) => setDraftEnd(e.target.value)} />
          </div>
          <button type="button" className="btn filter-apply" onClick={applyCustom}>
            {t('apply_filter')}
          </button>
        </div>
      )}

      <button type="button" className="filter-reset" onClick={reset}>
        {t('reset')}
      </button>
    </div>
  );
}
