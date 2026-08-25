const { Op } = require('sequelize');
const {
  Stock, Product, Warehouse, Purchase, Transfer, TransferItem, BranchSale, Payment, User,
} = require('../models');
const { computeBranchDebt } = require('./paymentController');
const { todayStr, daysAgoStr, monthStartStr } = require('../utils/date');

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
  const paymentWhere = startDate === endDate
    ? { payment_date: startDate }
    : { payment_date: { [Op.between]: [startDate, endDate] } };
  const purchaseWhere = startDate === endDate
    ? { purchase_date: startDate }
    : { purchase_date: { [Op.between]: [startDate, endDate] } };

  const payments = await Payment.findAll({ where: paymentWhere });
  const purchases = await Purchase.findAll({ where: purchaseWhere });

  const income = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const outcome = purchases.reduce((s, p) => s + parseFloat(p.total_cost), 0);
  return { income, outcome, net: income - outcome };
}

exports.adminDashboard = async (req, res) => {
  try {
    const central = await Warehouse.findOne({ where: { type: 'central' } });
    const branchWarehouses = await Warehouse.findAll({ where: { type: 'branch' } });
    const branchIds = branchWarehouses.map((w) => w.id);

    const totals = await stockTotals(null);
    const centralTotals = central ? await stockTotals([central.id]) : { qty: 0, cost: 0, sell: 0 };
    const branchTotals = await stockTotals(branchIds);

    const today = todayStr();
    const weekStart = daysAgoStr(6);
    const monthStart = monthStartStr();

    const daily = await incomeOutcome(today, today);
    const weekly = await incomeOutcome(weekStart, today);
    const monthly = await incomeOutcome(monthStart, today);

    const todayTransfers = await Transfer.findAll({
      where: { transfer_date: today, from_warehouse_id: central ? central.id : -1 },
    });
    const transfers_out_qty_result = await TransferItem.findAll({
      where: { transfer_id: todayTransfers.map((t) => t.id) },
    });
    const transfers_out_qty = transfers_out_qty_result.reduce((s, i) => s + i.quantity, 0);
    const transfers_out_value = todayTransfers.reduce((s, t) => s + parseFloat(t.total_cost), 0);

    const todayPurchases = await Purchase.findAll({ where: { purchase_date: today } });
    const purchases_in_qty = todayPurchases.reduce((s, p) => s + p.quantity, 0);
    const purchases_in_value = todayPurchases.reduce((s, p) => s + parseFloat(p.total_cost), 0);

    const todaySales = await BranchSale.findAll({ where: { sale_date: today } });
    const branch_sales = todaySales.reduce((s, sl) => s + parseFloat(sl.total_amount), 0);

    const branchUsers = await User.findAll({ where: { role: 'branch' } });
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
      });
    }

    res.json({
      total_carpets: totals.qty,
      total_cost_value: totals.cost,
      total_sell_value: totals.sell,
      central_carpets: centralTotals.qty,
      central_cost_value: centralTotals.cost,
      central_sell_value: centralTotals.sell,
      branch_carpets: branchTotals.qty,
      branch_cost_value: branchTotals.cost,
      branch_sell_value: branchTotals.sell,
      total_branch_debt,
      daily: {
        income: daily.income,
        outcome: daily.outcome,
        net: daily.net,
        transfers_out_qty,
        transfers_out_value,
        purchases_in_qty,
        purchases_in_value,
        branch_sales,
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
    const warehouse = await Warehouse.findOne({ where: { type: 'branch', branch_id: branchId } });
    if (!warehouse) return res.status(404).json({ error: 'Branch warehouse not found' });

    const stockTot = await stockTotals([warehouse.id]);
    const debt = await computeBranchDebt(branchId);

    const today = todayStr();
    const weekStart = daysAgoStr(6);
    const monthStart = monthStartStr();

    async function salesPeriod(start, end) {
      const where = start === end
        ? { sale_date: start, branch_id: branchId }
        : { sale_date: { [Op.between]: [start, end] }, branch_id: branchId };
      const sales = await BranchSale.findAll({ where });
      return {
        amount: sales.reduce((s, x) => s + parseFloat(x.total_amount), 0),
        qty: sales.reduce((s, x) => s + x.quantity, 0),
      };
    }

    const salesToday = await salesPeriod(today, today);
    const salesWeek = await salesPeriod(weekStart, today);
    const salesMonth = await salesPeriod(monthStart, today);

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
      debt,
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

    const today = todayStr();
    const today_transfers = await Transfer.findAll({
      where: { transfer_date: today },
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: TransferItem, as: 'items', include: [Product] },
      ],
      order: [['id', 'DESC']],
    });

    const today_purchases = await Purchase.findAll({
      where: { purchase_date: today },
      include: [Product, { model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']],
    });

    const allWarehouses = await Warehouse.findAll();
    const warehouses = [];
    for (const w of allWarehouses) {
      const t = await stockTotals([w.id]);
      warehouses.push({ id: w.id, name: w.name, type: w.type, total_qty: t.qty, cost_value: t.cost });
    }

    res.json({ central_stock, today_transfers, today_purchases, warehouses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
