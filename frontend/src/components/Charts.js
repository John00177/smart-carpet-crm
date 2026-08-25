import React from 'react';
import { formatMoney } from '../utils/format';

/**
 * Modest vertical bar chart. CSS-flex based (no chart library, no SVG text
 * distortion) so it stays crisp and responsive at any width.
 *
 * data: [{ label, value, sublabel? }]
 */
export function BarChart({ data, height = 160, accent = 'var(--color-accent)', emptyText }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 0);

  if (!data.length || max === 0) {
    return <div className="chart-empty" style={{ height }}>{emptyText}</div>;
  }

  // Thin out x labels when there are many bars, so they never overlap.
  const step = data.length > 16 ? Math.ceil(data.length / 8) : 1;

  return (
    <div className="bar-chart" style={{ height }}>
      <div className="bar-chart-plot">
        {data.map((d, i) => {
          const pct = max ? (Math.abs(d.value) / max) * 100 : 0;
          return (
            <div className="bar-col" key={i} title={`${d.label}: ${formatMoney(d.value)}`}>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${Math.max(pct, d.value > 0 ? 2 : 0)}%`, background: d.color || accent }}
                />
              </div>
              <div className="bar-label">{i % step === 0 ? d.label : ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Grouped revenue-vs-expenses chart with a net-profit line overlay.
 * Bars are CSS flex (crisp, responsive); the net line is an SVG overlay in a
 * normalised 0-100 space with non-scaling strokes so it never distorts.
 *
 * data: [{ label, revenue, expenses, net }]
 */
export function RevenueExpensesChart({ data, height = 210, labels, emptyText }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty" style={{ height }}>{emptyText}</div>;
  }

  const max = Math.max(...data.map((d) => Math.max(d.revenue, d.expenses)), 0);
  const nets = data.map((d) => d.net);
  const netMax = Math.max(...nets, 0);
  const netMin = Math.min(...nets, 0);
  const netSpan = (netMax - netMin) || 1;

  // Net line points in a 0-100 box, centred over each column.
  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
    const y = 100 - ((d.net - netMin) / netSpan) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="rev-exp-chart">
      <div className="rev-exp-scale">
        <span>{formatMoney(max)}</span>
        <span>{formatMoney(0)}</span>
      </div>

      <div className="rev-exp-plot-wrap" style={{ height }}>
        <div className="rev-exp-plot">
          {data.map((d, i) => (
            <div className="rev-exp-group" key={i}>
              <div className="rev-exp-bars">
                <div className="rev-exp-bar rev" style={{ height: `${max ? (d.revenue / max) * 100 : 0}%` }} />
                <div className="rev-exp-bar exp" style={{ height: `${max ? (d.expenses / max) * 100 : 0}%` }} />
              </div>
              <div className="rev-exp-label">{d.label}</div>
              <div className="rev-exp-tip">
                <div className="tip-row"><i style={{ background: 'var(--color-success)' }} />{labels.revenue}: <strong>{formatMoney(d.revenue)}</strong></div>
                <div className="tip-row"><i style={{ background: 'var(--color-danger)' }} />{labels.expenses}: <strong>{formatMoney(d.expenses)}</strong></div>
                <div className="tip-row"><i style={{ background: 'var(--color-accent)' }} />{labels.net}: <strong>{formatMoney(d.net)}</strong></div>
              </div>
            </div>
          ))}
        </div>

        {data.length > 1 && (
          <svg className="rev-exp-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={points}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="chart-legend">
        <span><i className="dot" style={{ background: 'var(--color-success)' }} />{labels.revenue}</span>
        <span><i className="dot" style={{ background: 'var(--color-danger)' }} />{labels.expenses}</span>
        <span><i className="dot" style={{ background: 'var(--color-accent)' }} />{labels.net}</span>
      </div>
    </div>
  );
}

/**
 * Donut chart built from a single SVG circle per segment using
 * stroke-dasharray on a circumference-100 circle.
 *
 * segments: [{ label, value, percentage, color }]
 */
export function DonutChart({ segments, total, centerLabel, emptyText, size = 190 }) {
  if (!segments || segments.length === 0 || !total) {
    return <div className="chart-empty" style={{ height: size }}>{emptyText}</div>;
  }

  const R = 15.91549431; // circumference = 100
  let offset = 25; // start at 12 o'clock

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg viewBox="0 0 42 42" role="img">
          <circle cx="21" cy="21" r={R} fill="none" stroke="var(--color-table-header)" strokeWidth="4.5" />
          {segments.map((s, i) => {
            const pct = total > 0 ? (s.value / total) * 100 : 0;
            const dash = `${pct} ${100 - pct}`;
            const el = (
              <circle
                key={i}
                cx="21" cy="21" r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="4.5"
                strokeDasharray={dash}
                strokeDashoffset={offset}
              >
                <title>{`${s.label}: ${formatMoney(s.value)} (${s.percentage}%)`}</title>
              </circle>
            );
            offset -= pct;
            return el;
          })}
        </svg>
        <div className="donut-center">
          <div className="donut-total">{formatMoney(total)}</div>
          <div className="donut-caption">{centerLabel}</div>
        </div>
      </div>

      <div className="donut-legend">
        {segments.map((s, i) => (
          <div className="donut-legend-item" key={i}>
            <span className="dot" style={{ background: s.color }} />
            <span className="donut-legend-name">{s.label}</span>
            <span className="donut-legend-pct">{s.percentage}%</span>
            <span className="donut-legend-amt">{formatMoney(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Horizontal proportion bar — shows how a total splits across segments.
 * segments: [{ label, value, color }]
 */
export function ProportionBar({ segments }) {
  const total = segments.reduce((s, x) => s + Math.max(0, Number(x.value) || 0), 0);

  return (
    <div className="proportion">
      <div className="proportion-track">
        {total > 0 && segments.map((s, i) => {
          const pct = (Math.max(0, Number(s.value) || 0) / total) * 100;
          if (pct <= 0) return null;
          return <div key={i} className="proportion-seg" style={{ width: `${pct}%`, background: s.color }} />;
        })}
      </div>
      <div className="proportion-legend">
        {segments.map((s, i) => (
          <div className="proportion-item" key={i}>
            <span className="proportion-dot" style={{ background: s.color }} />
            <span className="proportion-name">{s.label}</span>
            <span className="proportion-value">{formatMoney(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
