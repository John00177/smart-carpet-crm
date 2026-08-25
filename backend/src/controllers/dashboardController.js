const {
  Stock, Product, Warehouse, Purchase, Transfer, TransferItem, BranchSale, Payment, User,
} = require('../models');
const { computeBranchDebt } = require('./paymentController');
const {
  todayStr, daysAgoStr, monthStartStr, localDateStr, rangeFromQuery, dateWhere,
} = require('../utils/date');

async function stockTotals(warehouseIds) {
  const where = warehouseIds ? { warehouse_id: warehouseIds } : {};
  const stock = await Stock.findAll({ where, include: [Product] });
  let qty = 0, cost = 0, sell = 0;
  for (const row of stock) {
    qty += row.quantity;
    cost += row.quantity * parseFloat(row.Product.cost_price);
    sell += row.quantity * parseFloat(row.Product.sell_price);
  }
  return { qty, cost, sell };
}

async function incomeOutcome(startDate, endDate) {
  const payments = await Payment.findAll({ where: dateWhere('payment_date', startDate, endDate) });
  const purchases = await Purchase.findAll({ where: dateWhere('purchase_date', startDate, endDate) });
  const income = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const outcome = purchases.reduce((s, p) => s + parseFloat(p.total_cost), 0);
  return { income, outcome, net: income - outcome };
}

function parseDateStr(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Chart buckets for a range: daily for short ranges, monthly for long ones,
 * so a year view doesn't render 365 bars.
 */
function buildBuckets(startDate, endDate) {
  const a = parseDateStr(startDate);
  const b = parseDateStr(endDate);
  const days = Math.round((b - a) / 86400000) + 1;

  if (days <= 62) {
    const keys = [];
    const cur = new Date(a);
    while (cur <= b && keys.length < 62) {
      keys.push(localDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return { mode: 'day', keys };
  }

  const keys = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  while (cur <= b && keys.length < 36) {
    keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return { mode: 'month', keys };
}

function bucketOf(dateValue, mode) {
  const s = String(dateValue);
  return mode === 'day' ? s : s.slice(0, 7);
}

exports.adminDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);

    const central = await Warehouse.findOne({ where: { type: 'central' } });
    const branchWarehouses = await Warehouse.findAll({ where: { type: 'branch' } });
    const branchIds = branchWarehouses.map((w) => w.id);

    // Stock is a point-in-time snapshot — never date filtered.
    const totals = await stockTotals(null);
    const centralTotals = central ? await stockTotals([central.id]) : { qty: 0, cost: 0, sell: 0 };
    const branchTotals = await stockTotals(branchIds);

    const today = todayStr();
    const weekStart = daysAgoStr(6);
    const monthStart = monthStartStr();

    const daily = await incomeOutcome(today, today);
    const weekly = await incomeOutcome(weekStart, today);
    const monthly = await incomeOutcome(monthStart, today);

    // ---- Selected range: flows only ----
    const rangePayments = await Payment.findAll({ where: dateWhere('payment_date', startDate, endDate) });
    const rangePurchases = await Purchase.findAll({ where: dateWhere('purchase_date', startDate, endDate) });
    const rangeSales = await BranchSale.findAll({ where: dateWhere('sale_date', startDate, endDate) });
    const rangeTransfers = await Transfer.findAll({
      where: {
        ...dateWhere('transfer_date', startDate, endDate),
        from_warehouse_id: central ? central.id : -1,
      },
    });
    const rangeTransferItems = rangeTransfers.length
      ? await TransferItem.findAll({ where: { transfer_id: rangeTransfers.map((t) => t.id) } })
      : [];

    const range_income = rangePayments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const range_outcome = rangePurchases.reduce((s, p) => s + parseFloat(p.total_cost), 0);

    const range = {
      startDate,
      endDate,
      income: range_income,
      outcome: range_outcome,
      net: range_income - range_outcome,
      transfers_out_qty: rangeTransferItems.reduce((s, i) => s + i.quantity, 0),
      transfers_out_value: rangeTransfers.reduce((s, t) => s + parseFloat(t.total_cost), 0),
      purchases_in_qty: rangePurchases.reduce((s, p) => s + p.quantity, 0),
      purchases_in_value: range_outcome,
      branch_sales: rangeSales.reduce((s, x) => s + parseFloat(x.total_amount), 0),
      branch_sales_qty: rangeSales.reduce((s, x) => s + x.quantity, 0),
    };

    // Cash-flow chart series over the range.
    const { mode, keys } = buildBuckets(startDate, endDate);
    const incomeMap = {}, outcomeMap = {};
    for (const k of keys) { incomeMap[k] = 0; outcomeMap[k] = 0; }
    for (const p of rangePayments) {
      const k = bucketOf(p.payment_date, mode);
      if (k in incomeMap) incomeMap[k] += parseFloat(p.amount);
    }
    for (const p of rangePurchases) {
      const k = bucketOf(p.purchase_date, mode);
      if (k in outcomeMap) outcomeMap[k] += parseFloat(p.total_cost);
    }
    const cash_flow_series = keys.map((k) => ({
      key: k, income: incomeMap[k], outcome: outcomeMap[k],
    }));

    // ---- Debt is cumulative all-time, never date filtered ----
    const branchUsers = await User.findAll({ where: { role: 'branch' } });
    const allPayments = await Payment.findAll({ order: [['payment_date', 'DESC'], ['id', 'DESC']] });
    const allInboundTransfers = await Transfer.findAll({
      where: { to_warehouse_id: branchIds.length ? branchIds : [-1] },
      include: [{ model: TransferItem, as: 'items', include: [Product] }],
      order: [['transfer_date', 'DESC'], ['id', 'DESC']],
    });

    const branch_debts = [];
    let total_branch_debt = 0;
    for (const w of branchWarehouses) {
      const manager = branchUsers.find((u) => u.branch_id === w.branch_id);
      const debt = await computeBranchDebt(w.branch_id);
      total_branch_debt += debt.debt;
      branch_debts.push({
        id: w.branch_id,
        name: w.name.replace(' Warehouse', ''),
        manager_name: manager ? manager.name : null,
        total_given: debt.total_given,
        total_paid: debt.total_paid,
        debt: debt.debt,
        recent_payments: allPayments
          .filter((p) => p.branch_id === w.branch_id)
          .slice(0, 5)
          .map((p) => ({ id: p.id, payment_date: p.payment_date, amount: p.amount, notes: p.notes })),
        recent_transfers: allInboundTransfers
          .filter((tr) => tr.to_warehouse_id === w.id)
          .slice(0, 5)
          .map((tr) => ({
            id: tr.id,
            transfer_date: tr.transfer_date,
            total_sell_value: tr.total_sell_value,
            items: (tr.items || []).map((i) => ({
              quantity: i.quantity,
              name_uz: i.Product ? i.Product.name_uz : null,
              name_ru: i.Product ? i.Product.name_ru : null,
            })),
          })),
      });
    }

    res.json({
      total_carpets: totals.qty,
      total_cost_value: totals.cost,
      total_sell_value: totals.sell,
      potential_profit: totals.sell - totals.cost,
      central_carpets: centralTotals.qty,
      central_cost_value: centralTotals.cost,
      central_sell_value: centralTotals.sell,
      branch_carpets: branchTotals.qty,
      branch_cost_value: branchTotals.cost,
      branch_sell_value: branchTotals.sell,
      total_branch_debt,
      range,
      cash_flow_series,
      series_mode: mode,
      daily: {
        income: daily.income,
        outcome: daily.outcome,
        net: daily.net,
        transfers_out_qty: range.transfers_out_qty,
        transfers_out_value: range.transfers_out_value,
        purchases_in_qty: range.purchases_in_qty,
        purchases_in_value: range.purchases_in_value,
        branch_sales: range.branch_sales,
      },
      weekly,
      monthly,
      branch_debts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.branchDashboard = async (req, res) => {
  try {
    const branchId = req.user.branch_id;
    const { startDate, endDate } = rangeFromQuery(req.query);

    const warehouse = await Warehouse.findOne({ where: { type: 'branch', branch_id: branchId } });
    if (!warehouse) return res.status(404).json({ error: 'Branch warehouse not found' });

    const stockTot = await stockTotals([warehouse.id]);
    const debt = await computeBranchDebt(branchId);

    const today = todayStr();
    const weekStart = daysAgoStr(6);
    const monthStart = monthStartStr();

    async function salesPeriod(start, end) {
      const sales = await BranchSale.findAll({
        where: { ...dateWhere('sale_date', start, end), branch_id: branchId },
      });
      return {
        amount: sales.reduce((s, x) => s + parseFloat(x.total_amount), 0),
        qty: sales.reduce((s, x) => s + x.quantity, 0),
      };
    }

    const salesToday = await salesPeriod(today, today);
    const salesWeek = await salesPeriod(weekStart, today);
    const salesMonth = await salesPeriod(monthStart, today);

    // ---- Selected range ----
    const rangeSales = await BranchSale.findAll({
      where: { ...dateWhere('sale_date', startDate, endDate), branch_id: branchId },
      include: [Product],
      order: [['sale_date', 'DESC'], ['id', 'DESC']],
    });
    const rangePayments = await Payment.findAll({
      where: { ...dateWhere('payment_date', startDate, endDate), branch_id: branchId },
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
    });
    const rangeTransfers = await Transfer.findAll({
      where: { ...dateWhere('transfer_date', startDate, endDate), to_warehouse_id: warehouse.id },
      include: [{ model: TransferItem, as: 'items', include: [Product] }],
      order: [['transfer_date', 'DESC'], ['id', 'DESC']],
    });

    const range = {
      startDate,
      endDate,
      sales_amount: rangeSales.reduce((s, x) => s + parseFloat(x.total_amount), 0),
      sales_qty: rangeSales.reduce((s, x) => s + x.quantity, 0),
      payments_amount: rangePayments.reduce((s, p) => s + parseFloat(p.amount), 0),
      received_qty: rangeTransfers.reduce(
        (s, tr) => s + (tr.items || []).reduce((a, i) => a + i.quantity, 0), 0,
      ),
      received_value: rangeTransfers.reduce((s, tr) => s + parseFloat(tr.total_sell_value), 0),
    };

    // Sales chart series.
    const { mode, keys } = buildBuckets(startDate, endDate);
    const salesMap = {};
    for (const k of keys) salesMap[k] = 0;
    for (const s of rangeSales) {
      const k = bucketOf(s.sale_date, mode);
      if (k in salesMap) salesMap[k] += parseFloat(s.total_amount);
    }
    const sales_series = keys.map((k) => ({ key: k, value: salesMap[k] }));

    // Merged activity feed for the range.
    const activity = [
      ...rangeTransfers.map((tr) => ({
        type: 'transfer',
        date: tr.transfer_date,
        id: `t${tr.id}`,
        value: parseFloat(tr.total_sell_value),
        qty: (tr.items || []).reduce((a, i) => a + i.quantity, 0),
      })),
      ...rangePayments.map((p) => ({
        type: 'payment',
        date: p.payment_date,
        id: `p${p.id}`,
        value: parseFloat(p.amount),
      })),
      ...rangeSales.map((s) => ({
        type: 'sale',
        date: s.sale_date,
        id: `s${s.id}`,
        value: parseFloat(s.total_amount),
        qty: s.quantity,
        product: s.Product ? { name_uz: s.Product.name_uz, name_ru: s.Product.name_ru } : null,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 20);

    // Current stock detail for this branch.
    const stockRows = await Stock.findAll({
      where: { warehouse_id: warehouse.id },
      include: [Product],
    });
    const stock_items = stockRows
      .filter((s) => s.quantity > 0)
      .map((s) => ({
        id: s.Product.id,
        name_uz: s.Product.name_uz,
        name_ru: s.Product.name_ru,
        size: s.Product.size,
        color: s.Product.color,
        quantity: s.quantity,
        cost_value: s.quantity * parseFloat(s.Product.cost_price),
        sell_value: s.quantity * parseFloat(s.Product.sell_price),
      }));

    const recent_transfers = await Transfer.findAll({
      where: { to_warehouse_id: warehouse.id },
      include: [{ model: TransferItem, as: 'items', include: [Product] }],
      order: [['transfer_date', 'DESC'], ['id', 'DESC']],
      limit: 10,
    });

    const recent_payments = await Payment.findAll({
      where: { branch_id: branchId },
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
      limit: 10,
    });

    res.json({
      warehouse: { id: warehouse.id, name: warehouse.name },
      stock: { total_qty: stockTot.qty, cost_value: stockTot.cost, sell_value: stockTot.sell },
      stock_items,
      debt,
      range,
      sales_series,
      series_mode: mode,
      activity,
      sales: { today: salesToday, weekly: salesWeek, monthly: salesMonth },
      recent_transfers,
      recent_payments,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.warehouseDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const central = await Warehouse.findOne({ where: { type: 'central' } });

    const central_stock = central
      ? (await Stock.findAll({ where: { warehouse_id: central.id }, include: [Product] })).map((s) => ({
        id: s.Product.id,
        name_uz: s.Product.name_uz,
        name_ru: s.Product.name_ru,
        size: s.Product.size,
        color: s.Product.color,
        cost_price: s.Product.cost_price,
        sell_price: s.Product.sell_price,
        quantity: s.quantity,
      }))
      : [];

    const transfers = await Transfer.findAll({
      where: dateWhere('transfer_date', startDate, endDate),
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: TransferItem, as: 'items', include: [Product] },
      ],
      order: [['transfer_date', 'DESC'], ['id', 'DESC']],
    });

    const purchases = await Purchase.findAll({
      where: dateWhere('purchase_date', startDate, endDate),
      include: [Product, { model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['purchase_date', 'DESC'], ['id', 'DESC']],
    });

    const allWarehouses = await Warehouse.findAll();
    const warehouses = [];
    for (const w of allWarehouses) {
      const tot = await stockTotals([w.id]);
      warehouses.push({ id: w.id, name: w.name, type: w.type, total_qty: tot.qty, cost_value: tot.cost });
    }

    res.json({
      central_stock,
      range: { startDate, endDate },
      transfers,
      purchases,
      // Deprecated aliases kept so older clients keep working.
      today_transfers: transfers,
      today_purchases: purchases,
      warehouses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
