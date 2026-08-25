/**
 * Explicit short month names.
 * Slicing the full name is not safe: Uzbek "Iyun" and "Iyul" both truncate
 * to "Iyu", which makes June and July indistinguishable on a chart axis.
 */
export const SHORT_MONTHS = {
  uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
};

/** monthKey is "YYYY-MM". */
export function shortMonth(monthKey, lang) {
  const idx = Number(String(monthKey).slice(5, 7)) - 1;
  const list = SHORT_MONTHS[lang] || SHORT_MONTHS.uz;
  return list[idx] || monthKey;
}
