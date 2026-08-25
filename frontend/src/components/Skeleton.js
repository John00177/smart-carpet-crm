import React from 'react';

export function Skeleton({ width = '100%', height = 14, radius = 6, style }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

/** Placeholder matching the stat-card shape. */
export function SkeletonCards({ count = 4, tall = false }) {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card" key={i}>
          <Skeleton width="55%" height={10} />
          <div style={{ height: 14 }} />
          <Skeleton width="70%" height={tall ? 30 : 24} />
          {tall && <><div style={{ height: 10 }} /><Skeleton width="45%" height={10} /></>}
        </div>
      ))}
    </div>
  );
}

/** Placeholder matching a table section. */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="section">
      <Skeleton width="30%" height={14} />
      <div style={{ height: 20 }} />
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-row" key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} width={c === 0 ? '22%' : '14%'} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = '—', text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-text">{text}</div>
    </div>
  );
}
