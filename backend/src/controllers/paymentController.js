const { Op } = require('sequelize');
const { Payment, Transfer, Warehouse, User } = require('../models');
const { todayStr, rangeFromQuery, dateWhere } = require('../utils/date');

async function computeBranchDebt(branchId) {
  const warehouse = await Warehouse.findOne({ where: { type: 'branch', branch_id: branchId } });
  let total_given = 0;
  if (warehouse) {
    const transfers = await Transfer.findAll({ where: { to_warehouse_id: warehouse.id } });
    total_given = transfers.reduce((sum, tr) => sum + parseFloat(tr.total_sell_value), 0);
  }
  const payments = await Payment.findAll({ where: { branch_id: branchId } });
  const total_paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  return { total_given, total_paid, debt: total_given - total_paid };
}
exports.computeBranchDebt = computeBranchDebt;

exports.list = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const where = { ...dateWhere('payment_date', startDate, endDate) };
    if (req.user.role === 'branch') {
      // Branch users are always scoped to their own branch, whatever they ask for.
      where.branch_id = req.user.branch_id;
    } else if (req.query.branch_id) {
      where.branch_id = req.query.branch_id;
    }
    const payments = await Payment.findAll({ where, order: [['payment_date', 'DESC'], ['id', 'DESC']] });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.byBranch = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { branch_id: req.params.id },
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    let { branch_id, amount, currency, payment_date, notes } = req.body;
    if (req.user.role === 'branch') branch_id = req.user.branch_id;
    if (!branch_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'branch_id and positive amount are required' });
    }
    const payment = await Payment.create({
      branch_id,
      amount,
      currency: currency || 'USD',
      payment_date: payment_date || new Date(),
      notes,
    });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.allDebts = async (req, res) => {
  try {
    const branchUsers = await User.findAll({ where: { role: 'branch' } });
    const warehouses = await Warehouse.findAll({ where: { type: 'branch' } });
    const results = [];
    for (const w of warehouses) {
      const manager = branchUsers.find((u) => u.branch_id === w.branch_id);
      const debt = await computeBranchDebt(w.branch_id);
      results.push({
        id: w.branch_id,
        name: w.name.replace(' Warehouse', ''),
        manager_name: manager ? manager.name : null,
        ...debt,
      });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.debtForBranch = async (req, res) => {
  try {
    const debt = await computeBranchDebt(req.params.branchId);
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.dailyTotal = async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const payments = await Payment.findAll({ where: { payment_date: date } });
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    res.json({ date, total_amount: total, count: payments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.periodTotal = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });
    const payments = await Payment.findAll({ where: { payment_date: { [Op.between]: [startDate, endDate] } } });
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    res.json({ startDate, endDate, total_amount: total, count: payments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
