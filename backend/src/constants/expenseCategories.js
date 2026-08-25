/** Single source of truth for expense categories (shared by model + controllers). */
const EXPENSE_CATEGORIES = [
  { key: 'lunch', uz: 'Ovqat', ru: 'Обед' },
  { key: 'gas_oil', uz: "Yonilg'i", ru: 'Бензин и масло' },
  { key: 'vehicle', uz: 'Transport', ru: 'Транспорт' },
  { key: 'rent', uz: 'Ijara', ru: 'Аренда' },
  { key: 'salary', uz: 'Ish haqi', ru: 'Зарплата' },
  { key: 'kindergarten', uz: "Bolalar bog'chasi", ru: 'Детский сад' },
  { key: 'utilities', uz: 'Kommunal', ru: 'Коммунальные' },
  { key: 'other', uz: 'Boshqa', ru: 'Другое' },
];

const CATEGORY_KEYS = EXPENSE_CATEGORIES.map((c) => c.key);

function labelsFor(key) {
  const c = EXPENSE_CATEGORIES.find((x) => x.key === key);
  return { category_uz: c ? c.uz : key, category_ru: c ? c.ru : key };
}

const MONTH_NAMES = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};

module.exports = { EXPENSE_CATEGORIES, CATEGORY_KEYS, labelsFor, MONTH_NAMES };
