const { Op } = require('sequelize');
const { Transfer, TransferItem, Stock, Product, Warehouse, User } = require('../models');
const sequelize = require('../config/database');
const { rangeFromQuery, dateWhere } = require('../utils/date');
const { metersFromPieces, piecesFromMeters, applyStockDelta, valueOf } = require('../utils/meters');

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

    // Resolve every line to metres first (metres are the unit that actually moves),
    // then validate the whole basket before mutating any stock.
    const resolved = [];
    for (const item of items) {
      const { product_id } = item;
      const pieces = Number(item.quantity);
      if (!product_id || !isFinite(pieces) || pieces <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Each item requires product_id and positive quantity' });
      }

      const product = await Product.findByPk(product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ error: `Product ${product_id} not found` });
      }

      // Metres default to pieces x meters_per_piece, but staff may override
      // when handing over a partial roll.
      const meters = item.meter_quantity != null && item.meter_quantity !== ''
        ? Number(item.meter_quantity)
        : metersFromPieces(pieces, product);

      if (!isFinite(meters) || meters <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'meter_quantity must be a positive number' });
      }

      const fromStock = await Stock.findOne({
        where: { warehouse_id: from_warehouse_id, product_id }, transaction: t,
      });
      const available = fromStock ? parseFloat(fromStock.meter_quantity) : 0;
      if (available < meters) {
        await t.rollback();
        return res.status(400).json({
          error: `Insufficient meters for product ${product_id}: ${available} available, ${meters} requested`,
        });
      }

      resolved.push({ product, product_id, pieces, meters });
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
      const { product, product_id, meters } = line;
      // Value follows the metres actually handed over, not the nominal piece count.
      const piecesMoved = piecesFromMeters(meters, product);

      await TransferItem.create({
        transfer_id: transfer.id,
        product_id,
        quantity: piecesMoved,
        meter_quantity: meters,
        unit_cost: product.cost_price,
        unit_sell: product.sell_price,
      }, { transaction: t });

      // Value from metres, not from the 2dp-rounded piece count — this figure
      // becomes the branch's debt, so it must match the stock value exactly.
      const v = valueOf(meters, product);
      total_cost += v.cost;
      total_sell_value += v.sell;

      await applyStockDelta({
        warehouseId: from_warehouse_id, productId: product_id,
        meterDelta: -meters, product, transaction: t,
      });
      await applyStockDelta({
        warehouseId: to_warehouse_id, productId: product_id,
        meterDelta: meters, product, transaction: t,
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
