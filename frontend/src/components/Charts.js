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
