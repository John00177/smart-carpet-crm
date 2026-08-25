/**
 * Local-calendar date helpers.
 * Uses local getFullYear/getMonth/getDate (never toISOString) so the range
 * matches the dates the backend stores — same reasoning as backend/src/utils/date.js.
 */

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

/** Monday-based start of the current week. */
export function weekStartStr() {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setDate(d.getDate() - dow);
  return toDateStr(d);
}

export function monthStartStr() {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function yearStartStr() {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), 0, 1));
}

export const PRESETS = ['today', 'week', 'month', 'year', 'custom'];

/** Resolve a preset key to a {startDate, endDate} pair. */
export function rangeForPreset(preset) {
  const end = todayStr();
  switch (preset) {
    case 'today': return { startDate: todayStr(), endDate: end };
    case 'week': return { startDate: weekStartStr(), endDate: end };
    case 'year': return { startDate: yearStartStr(), endDate: end };
    case 'month':
    default: return { startDate: monthStartStr(), endDate: end };
  }
}

/** Default filter state used by every page: current month. */
export function defaultRange() {
  return { preset: 'month', ...rangeForPreset('month') };
}

/** Every day in an inclusive range, as YYYY-MM-DD. Capped to avoid huge arrays. */
export function eachDay(startDate, endDate, cap = 366) {
  const out = [];
  const cur = parseDateStr(startDate);
  const end = parseDateStr(endDate);
  if (!cur || !end) return out;
  while (cur <= end && out.length < cap) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Parse YYYY-MM-DD into a local Date (avoids the UTC shift of new Date(str)). */
export function parseDateStr(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Number of whole days spanned by a range (inclusive). */
export function daysBetween(startDate, endDate) {
  const a = parseDateStr(startDate);
  const b = parseDateStr(endDate);
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

/** "YYYY-MM" buckets covering a range, for month-grouped charts. */
export function eachMonth(startDate, endDate, cap = 24) {
  const out = [];
  const a = parseDateStr(startDate);
  const b = parseDateStr(endDate);
  if (!a || !b) return out;
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  while (cur <= b && out.length < cap) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
