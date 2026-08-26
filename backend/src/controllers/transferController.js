const { Op } = require('sequelize');
const { Transfer, TransferItem, Stock, Product, Warehouse, User } = require('../models');
const sequelize = require('../config/database');
const { rangeFromQuery, dateWhere } = require('../utils/date');
const { isMeterType, applyStockDelta, valueOf } = require('../utils/meters');

exports.list = async (req, res) => {
  try {
    const { startDate, endDate } = rangeFromQuery(req.query);
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

    // Resolve and validate every line against its product's own unit and
    // stock field before mutating anything.
    const resolved = [];
    for (const item of items) {
      const { product_id } = item;
      const amount = Number(item.amount);
      if (!product_id || !isFinite(amount) || amount <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Each item requires product_id and a positive amount' });
      }

      const product = await Product.findByPk(product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ error: `Product ${product_id} not found` });
      }

      const meter = isMeterType(product);
      const fromStock = await Stock.findOne({
        where: { warehouse_id: from_warehouse_id, product_id }, transaction: t,
      });
      const available = fromStock ? parseFloat(meter ? fromStock.meter_quantity : fromStock.quantity) : 0;
      if (available < amount) {
        await t.rollback();
        return res.status(400).json({
          error: `Insufficient stock for product ${product_id}: ${available} available, ${amount} requested`,
        });
      }

      resolved.push({ product, product_id, amount, meter });
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

    for (const line of resolved) {
      const { product, product_id, amount, meter } = line;

      await TransferItem.create({
        transfer_id: transfer.id,
        product_id,
        quantity: meter ? 0 : amount,
        meter_quantity: meter ? amount : 0,
        unit_cost: product.cost_price,
        unit_sell: product.sell_price,
      }, { transaction: t });

      const v = valueOf({ quantity: amount, meter_quantity: amount }, product);
      total_cost += v.cost;
      total_sell_value += v.sell;

      await applyStockDelta({
        warehouseId: from_warehouse_id, productId: product_id,
        delta: -amount, product, transaction: t,
      });
      await applyStockDelta({
        warehouseId: to_warehouse_id, productId: product_id,
        delta: amount, product, transaction: t,
      });
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
