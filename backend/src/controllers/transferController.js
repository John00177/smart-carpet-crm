const { Op } = require('sequelize');
const { Transfer, TransferItem, Stock, Product, Warehouse, User } = require('../models');
const sequelize = require('../config/database');

exports.list = async (req, res) => {
  try {
    const transfers = await Transfer.findAll({
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: TransferItem, as: 'items', include: [Product] },
      ],
      order: [['transfer_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.byWarehouse = async (req, res) => {
  try {
    const id = req.params.id;
    const transfers = await Transfer.findAll({
      where: { [Op.or]: [{ from_warehouse_id: id }, { to_warehouse_id: id }] },
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: TransferItem, as: 'items', include: [Product] },
      ],
      order: [['transfer_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { from_warehouse_id, to_warehouse_id, transfer_date, notes, items } = req.body;
    if (!from_warehouse_id || !to_warehouse_id || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'from_warehouse_id, to_warehouse_id, and items[] are required' });
    }
    if (from_warehouse_id === to_warehouse_id) {
      await t.rollback();
      return res.status(400).json({ error: 'Source and destination warehouses must differ' });
    }

    let total_cost = 0;
    let total_sell_value = 0;

    for (const item of items) {
      const { product_id, quantity } = item;
      if (!product_id || !quantity || quantity <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Each item requires product_id and positive quantity' });
      }
      const fromStock = await Stock.findOne({ where: { warehouse_id: from_warehouse_id, product_id }, transaction: t });
      if (!fromStock || fromStock.quantity < quantity) {
        await t.rollback();
        return res.status(400).json({ error: `Insufficient stock for product ${product_id} in source warehouse` });
      }
    }

    const transfer = await Transfer.create({
      from_warehouse_id,
      to_warehouse_id,
      total_cost: 0,
      total_sell_value: 0,
      transfer_date: transfer_date || new Date(),
      notes,
      created_by: req.user.id,
    }, { transaction: t });

    for (const item of items) {
      const { product_id, quantity } = item;
      const product = await Product.findByPk(product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ error: `Product ${product_id} not found` });
      }

      await TransferItem.create({
        transfer_id: transfer.id,
        product_id,
        quantity,
        unit_cost: product.cost_price,
        unit_sell: product.sell_price,
      }, { transaction: t });

      total_cost += quantity * parseFloat(product.cost_price);
      total_sell_value += quantity * parseFloat(product.sell_price);

      const fromStock = await Stock.findOne({ where: { warehouse_id: from_warehouse_id, product_id }, transaction: t });
      await fromStock.decrement('quantity', { by: quantity, transaction: t });

      const [toStock] = await Stock.findOrCreate({
        where: { warehouse_id: to_warehouse_id, product_id },
        defaults: { quantity: 0 },
        transaction: t,
      });
      await toStock.increment('quantity', { by: quantity, transaction: t });
    }

    await transfer.update({ total_cost, total_sell_value }, { transaction: t });

    await t.commit();

    const full = await Transfer.findByPk(transfer.id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: TransferItem, as: 'items', include: [Product] },
      ],
    });
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
