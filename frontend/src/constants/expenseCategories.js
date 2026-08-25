/** Category presentation: icon + colour. Labels come from the translation dictionary. */
export const EXPENSE_CATEGORIES = [
  { key: 'lunch', icon: '🍽️', color: '#f59e0b' },
  { key: 'gas_oil', icon: '⛽', color: '#dc2626' },
  { key: 'vehicle', icon: '🚗', color: '#2563eb' },
  { key: 'rent', icon: '🏠', color: '#7c3aed' },
  { key: 'salary', icon: '💼', color: '#059669' },
  { key: 'kindergarten', icon: '🧒', color: '#ec4899' },
  { key: 'utilities', icon: '💡', color: '#0891b2' },
  { key: 'other', icon: '📦', color: '#6b7280' },
];

const BY_KEY = EXPENSE_CATEGORIES.reduce((acc, c) => { acc[c.key] = c; return acc; }, {});

export function categoryMeta(key) {
  return BY_KEY[key] || { key, icon: '📦', color: '#6b7280' };
}
