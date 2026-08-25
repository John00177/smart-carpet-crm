export function money(n) {
  const num = Number(n) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function qty(n) {
  return Number(n) || 0;
}

export function dateStr(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString();
}
