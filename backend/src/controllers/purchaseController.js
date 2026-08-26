const { Op } = require('sequelize');
const { Purchase, Stock, Warehouse, Product, User } = require('../models');
const sequelize = require('../config/database');
const { todayStr, rangeFromQuery, dateWhere } = require('../utils/date');
const { isMeterType, applyStockDelta } = require('../utils/meters');

exports.list = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
    const purchases = await Purchase.findAll({
      where: dateWhere('purchase_date', startDate, endDate),
      include: [Product, { model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['purchase_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, amount, unit_cost, currency, purchase_date, supplier, notes } = req.body;
    const qty = Number(amount);
    if (!product_id || !isFinite(qty) || qty <= 0 || unit_cost == null) {
      await t.rollback();
      return res.status(400).json({ error: 'product_id, amount, unit_cost are required' });
    }
    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const meter = isMeterType(product);
    const total_cost = qty * unit_cost;

    const purchase = await Purchase.create({
      product_id,
      quantity: meter ? 0 : Math.round(qty),
      meter_quantity: meter ? qty : 0,
      unit_cost,
      total_cost,
      currency: currency || 'USD',
      purchase_date: purchase_date || new Date(),
      supplier,
      notes,
      created_by: req.user.id,
    }, { transaction: t });

    const central = await Warehouse.findOne({ where: { type: 'central' }, transaction: t });
    if (!central) {
      await t.rollback();
      return res.status(500).json({ error: 'Central warehouse not configured' });
    }

    await applyStockDelta({
      warehouseId: central.id,
      productId: product_id,
      delta: qty,
      product,
      transaction: t,
    });

    await t.commit();
    res.status(201).json(purchase);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.dailyTotal = async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const purchases = await Purchase.findAll({ where: { purchase_date: date } });
    const total = purchases.reduce((sum, p) => sum + parseFloat(p.total_cost), 0);
    const qty = purchases.reduce((sum, p) => sum + p.quantity, 0);
    const meters = purchases.reduce((sum, p) => sum + parseFloat(p.meter_quantity || 0), 0);
    res.json({ date, total_cost: total, quantity: qty, meter_quantity: meters, count: purchases.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.periodTotal = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });
    const purchases = await Purchase.findAll({
      where: { purchase_date: { [Op.between]: [startDate, endDate] } },
    });
    const total = purchases.reduce((sum, p) => sum + parseFloat(p.total_cost), 0);
    const qty = purchases.reduce((sum, p) => sum + p.quantity, 0);
    const meters = purchases.reduce((sum, p) => sum + parseFloat(p.meter_quantity || 0), 0);
    res.json({ startDate, endDate, total_cost: total, quantity: qty, meter_quantity: meters, count: purchases.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
