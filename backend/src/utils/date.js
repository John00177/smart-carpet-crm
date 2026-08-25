const { Op } = require('sequelize');

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return localDateStr(new Date());
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

function monthStartStr() {
  const d = new Date();
  return localDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** True only for a well-formed, real YYYY-MM-DD calendar date. */
function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Resolve a {startDate, endDate} range from request query params.
 * Accepts ?date=YYYY-MM-DD (single day) or ?startDate=&endDate=.
 * Invalid or missing values fall back to the current month.
 */
function rangeFromQuery(query = {}) {
  const single = isValidDateStr(query.date) ? query.date : null;
  if (single) return { startDate: single, endDate: single };

  const start = isValidDateStr(query.startDate) ? query.startDate : null;
  const end = isValidDateStr(query.endDate) ? query.endDate : null;

  if (start && end) {
    return start <= end
      ? { startDate: start, endDate: end }
      : { startDate: end, endDate: start };
  }
  if (start) return { startDate: start, endDate: todayStr() };
  if (end) return { startDate: monthStartStr(), endDate: end };

  return { startDate: monthStartStr(), endDate: todayStr() };
}

/** Sequelize where-clause fragment for a DATEONLY column across a range. */
function dateWhere(field, startDate, endDate) {
  if (startDate === endDate) return { [field]: startDate };
  return { [field]: { [Op.between]: [startDate, endDate] } };
}

module.exports = {
  localDateStr,
  todayStr,
  daysAgoStr,
  monthStartStr,
  isValidDateStr,
  rangeFromQuery,
  dateWhere,
};
