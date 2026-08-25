const { Op } = require('sequelize');
const { Purchase, Stock, Warehouse, Product, User } = require('../models');
const sequelize = require('../config/database');

exports.list = async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
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
    const { product_id, quantity, unit_cost, currency, purchase_date, supplier, notes } = req.body;
    if (!product_id || !quantity || unit_cost == null) {
      await t.rollback();
      return res.status(400).json({ error: 'product_id, quantity, unit_cost are required' });
    }
    const product = await Product.findByPk(product_id);
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    const total_cost = quantity * unit_cost;

    const purchase = await Purchase.create({
      product_id,
      quantity,
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

    const [stockRow] = await Stock.findOrCreate({
      where: { warehouse_id: central.id, product_id },
      defaults: { quantity: 0 },
      transaction: t,
    });
    await stockRow.increment('quantity', { by: quantity, transaction: t });

    await t.commit();
    res.status(201).json(purchase);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.dailyTotal = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const purchases = await Purchase.findAll({ where: { purchase_date: date } });
    const total = purchases.reduce((sum, p) => sum + parseFloat(p.total_cost), 0);
    const qty = purchases.reduce((sum, p) => sum + p.quantity, 0);
    res.json({ date, total_cost: total, quantity: qty, count: purchases.length });
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
    res.json({ startDate, endDate, total_cost: total, quantity: qty, count: purchases.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
