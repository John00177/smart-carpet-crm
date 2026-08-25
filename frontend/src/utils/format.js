/**
 * Money formatting with no trailing zeros.
 *   500      -> "$500"
 *   75.00    -> "$75"
 *   1250.5   -> "$1,250.50"
 *   0.99     -> "$0.99"
 * Negative values keep the sign in front of the currency symbol: -$4,500
 */
export function formatMoney(value) {
  const num = Number(value);
  if (!isFinite(num)) return '$0';

  const rounded = Math.round(num * 100) / 100;
  const isWhole = Math.abs(rounded % 1) < 1e-9;
  const abs = Math.abs(rounded);

  const body = abs.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  });

  return `${rounded < 0 ? '-' : ''}$${body}`;
}

/** Quantities: integer only, thousand separators. 1240 -> "1,240" */
export function formatQty(value) {
  const num = Number(value);
  if (!isFinite(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
}

/** Compact money for chart axis labels: 1500 -> "$1.5k", 25000 -> "$25k" */
export function formatMoneyCompact(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${trimZero(abs / 1000000)}M`;
  if (abs >= 1000) return `${sign}$${trimZero(abs / 1000)}k`;
  return formatMoney(num);
}

function trimZero(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function dateStr(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString();
}

/** Short date for timelines/charts: "26 Aug" */
export function dateShort(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Backwards-compatible aliases (older call sites used money/qty).
export const money = formatMoney;
export const qty = formatQty;
