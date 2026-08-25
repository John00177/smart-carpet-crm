const { Expense, BranchSale, Warehouse, User } = require('../models');
const { rangeFromQuery, dateWhere, todayStr, isValidDateStr } = require('../utils/date');
const { CATEGORY_KEYS, EXPENSE_CATEGORIES, labelsFor, MONTH_NAMES } = require('../constants/expenseCategories');

/** Branch users are hard-scoped to their own branch; admins may target any branch. */
function scopeBranch(req) {
  if (req.user.role === 'branch') return req.user.branch_id;
  if (req.query.branch_id && /^\d+$/.test(String(req.query.branch_id))) {
    return Number(req.query.branch_id);
  }
  return null; // admin, all branches
}

async function branchNameMap() {
  const warehouses = await Warehouse.findAll({ where: { type: 'branch' } });
  const map = {};
  for (const w of warehouses) map[w.branch_id] = w.name.replace(' Warehouse', '');
  return map;
}

exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const where = { ...dateWhere('expense_date', startDate, endDate) };

    const branchId = scopeBranch(req);
    if (branchId !== null) where.branch_id = branchId;

    if (req.query.category) {
      if (!CATEGORY_KEYS.includes(req.query.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      where.category = req.query.category;
    }

    const expenses = await Expense.findAll({
      where,
      order: [['expense_date', 'DESC'], ['id', 'DESC']],
    });

    const names = req.user.role === 'admin' ? await branchNameMap() : null;

    res.json(expenses.map((e) => ({
      id: e.id,
      branch_id: e.branch_id,
      branch_name: names ? (names[e.branch_id] || null) : undefined,
      category: e.category,
      ...labelsFor(e.category),
      amount: e.amount,
      currency: e.currency,
      expense_date: e.expense_date,
      description: e.description,
      notes: e.notes,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { category, amount, expense_date, description, notes, currency } = req.body;

    let branch_id;
    if (req.user.role === 'branch') {
      branch_id = req.user.branch_id;
    } else {
      branch_id = Number(req.body.branch_id);
      if (!branch_id) return res.status(400).json({ error: 'branch_id is required' });
    }

    if (!category || !CATEGORY_KEYS.includes(category)) {
      return res.status(400).json({ error: 'Invalid or missing category' });
    }
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (expense_date && !isValidDateStr(expense_date)) {
      return res.status(400).json({ error: 'Invalid expense_date' });
    }

    const expense = await Expense.create({
      branch_id,
      category,
      amount: amt,
      currency: currency || 'USD',
      expense_date: expense_date || todayStr(),
      description: description || null,
      notes: notes || null,
      created_by: req.user.id,
    });

    res.status(201).json({ ...expense.toJSON(), ...labelsFor(expense.category) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    // A branch may only delete its own expenses.
    if (req.user.role === 'branch' && expense.branch_id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await expense.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const branchId = scopeBranch(req);

    const expenseWhere = { ...dateWhere('expense_date', startDate, endDate) };
    const saleWhere = { ...dateWhere('sale_date', startDate, endDate) };
    if (branchId !== null) {
      expenseWhere.branch_id = branchId;
      saleWhere.branch_id = branchId;
    }

    const expenses = await Expense.findAll({ where: expenseWhere });
    const sales = await BranchSale.findAll({ where: saleWhere });

    // Build the month buckets spanning the range so empty months still appear.
    const months = [];
    const [sy, sm] = startDate.split('-').map(Number);
    const [ey, em] = endDate.split('-').map(Number);
    const cur = new Date(sy, sm - 1, 1);
    const end = new Date(ey, em - 1, 1);
    while (cur <= end && months.length < 36) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }

    const revenueByMonth = {};
    const expenseByMonth = {};
    for (const m of months) { revenueByMonth[m] = 0; expenseByMonth[m] = 0; }

    for (const s of sales) {
      const m = String(s.sale_date).slice(0, 7);
      if (m in revenueByMonth) revenueByMonth[m] += parseFloat(s.total_amount);
    }
    for (const e of expenses) {
      const m = String(e.expense_date).slice(0, 7);
      if (m in expenseByMonth) expenseByMonth[m] += parseFloat(e.amount);
    }

    res.json(months.map((m) => {
      const idx = Number(m.slice(5, 7)) - 1;
      const revenue = revenueByMonth[m];
      const exp = expenseByMonth[m];
      return {
        month: m,
        month_name_uz: MONTH_NAMES.uz[idx],
        month_name_ru: MONTH_NAMES.ru[idx],
        revenue,
        expenses: exp,
        net: revenue - exp,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategoryBreakdown = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const where = { ...dateWhere('expense_date', startDate, endDate) };
    const branchId = scopeBranch(req);
    if (branchId !== null) where.branch_id = branchId;

    const expenses = await Expense.findAll({ where });

    const totals = {};
    for (const c of EXPENSE_CATEGORIES) totals[c.key] = 0;
    let grand = 0;
    for (const e of expenses) {
      const amt = parseFloat(e.amount);
      totals[e.category] = (totals[e.category] || 0) + amt;
      grand += amt;
    }

    const rows = EXPENSE_CATEGORIES
      .map((c) => ({
        category: c.key,
        category_uz: c.uz,
        category_ru: c.ru,
        amount: totals[c.key],
        percentage: grand > 0 ? Math.round((totals[c.key] / grand) * 1000) / 10 : 0,
      }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    res.json({ total: grand, categories: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDailyTotal = async (req, res) => {
  try {
    const date = isValidDateStr(req.query.date) ? req.query.date : todayStr();
    const where = { expense_date: date };
    const branchId = scopeBranch(req);
    if (branchId !== null) where.branch_id = branchId;

    const expenses = await Expense.findAll({ where });
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ date, total, count: expenses.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPeriodTotal = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const where = { ...dateWhere('expense_date', startDate, endDate) };
    const branchId = scopeBranch(req);
    if (branchId !== null) where.branch_id = branchId;

    const expenses = await Expense.findAll({ where });
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ startDate, endDate, total, count: expenses.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Per-branch revenue / expenses / profit for a range.
 * Exported for reuse by the admin dashboard.
 */
async function branchProfitability(startDate, endDate) {
  const warehouses = await Warehouse.findAll({ where: { type: 'branch' } });
  const branchUsers = await User.findAll({ where: { role: 'branch' } });
  const sales = await BranchSale.findAll({ where: dateWhere('sale_date', startDate, endDate) });
  const expenses = await Expense.findAll({ where: dateWhere('expense_date', startDate, endDate) });

  return warehouses.map((w) => {
    const bid = w.branch_id;
    const revenue = sales
      .filter((s) => s.branch_id === bid)
      .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
    const spend = expenses
      .filter((e) => e.branch_id === bid)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const manager = branchUsers.find((u) => u.branch_id === bid);
    const net = revenue - spend;
    return {
      id: bid,
      name: w.name.replace(' Warehouse', ''),
      manager_name: manager ? manager.name : null,
      revenue,
      expenses: spend,
      net,
      margin: revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : 0,
    };
  });
}

exports.branchProfitability = branchProfitability;
