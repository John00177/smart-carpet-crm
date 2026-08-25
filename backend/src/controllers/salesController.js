const { Op } = require('sequelize');
const { BranchSale, Stock, Warehouse, Product } = require('../models');
const sequelize = require('../config/database');
const { todayStr } = require('../utils/date');

async function findBranchWarehouse(branchId, t) {
  return Warehouse.findOne({ where: { type: 'branch', branch_id: branchId }, transaction: t });
}

exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'branch') {
      where.branch_id = req.user.branch_id;
    }
    const sales = await BranchSale.findAll({
      where,
      include: [Product],
      order: [['sale_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.byBranch = async (req, res) => {
  try {
    const sales = await BranchSale.findAll({
      where: { branch_id: req.params.id },
      include: [Product],
      order: [['sale_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const branch_id = req.user.branch_id;
    const { product_id, quantity, sell_price, currency, sale_date, customer_name, notes } = req.body;
    if (!product_id || !quantity || quantity <= 0 || sell_price == null) {
      await t.rollback();
      return res.status(400).json({ error: 'product_id, quantity, sell_price are required' });
    }

    const warehouse = await findBranchWarehouse(branch_id, t);
    if (!warehouse) {
      await t.rollback();
      return res.status(404).json({ error: 'Branch warehouse not found' });
    }

    const stock = await Stock.findOne({ where: { warehouse_id: warehouse.id, product_id }, transaction: t });
    if (!stock || stock.quantity < quantity) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient stock for this sale' });
    }

    const total_amount = quantity * sell_price;

    const sale = await BranchSale.create({
      branch_id,
      product_id,
      quantity,
      sell_price,
      total_amount,
      currency: currency || 'USD',
      sale_date: sale_date || new Date(),
      customer_name,
      notes,
    }, { transaction: t });

    await stock.decrement('quantity', { by: quantity, transaction: t });

    await t.commit();
    res.status(201).json(sale);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.dailyTotal = async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const where = { sale_date: date };
    if (req.query.branch_id) where.branch_id = req.query.branch_id;
    else if (req.user.role === 'branch') where.branch_id = req.user.branch_id;
    const sales = await BranchSale.findAll({ where });
    const total = sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
    const qty = sales.reduce((sum, s) => sum + s.quantity, 0);
    res.json({ date, total_amount: total, quantity: qty, count: sales.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.periodTotal = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });
    const where = { sale_date: { [Op.between]: [startDate, endDate] } };
    if (req.query.branch_id) where.branch_id = req.query.branch_id;
    else if (req.user.role === 'branch') where.branch_id = req.user.branch_id;
    const sales = await BranchSale.findAll({ where });
    const total = sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
    const qty = sales.reduce((sum, s) => sum + s.quantity, 0);
    res.json({ startDate, endDate, total_amount: total, quantity: qty, count: sales.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
