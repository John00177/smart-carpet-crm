const { Stock, Product, Warehouse } = require('../models');
const { valueOf, round2, isMeterType } = require('../utils/meters');

exports.list = async (req, res) => {
  try {
    const stock = await Stock.findAll({ include: [Product, Warehouse] });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.byWarehouse = async (req, res) => {
  try {
    const stock = await Stock.findAll({
      where: { warehouse_id: req.params.id },
      include: [Product],
    });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Aggregate a set of stock rows into separate piece/meter totals plus
 * combined cost/sell value. Piece and meter quantities are never summed
 * together — they are different units.
 */
function aggregate(rows) {
  let pieceQty = 0, meterQty = 0, cost = 0, sell = 0;
  for (const row of rows) {
    if (!row.Product) continue;
    const v = valueOf(row, row.Product);
    pieceQty += v.quantity;
    meterQty += v.meter_quantity;
    cost += v.cost;
    sell += v.sell;
  }
  return {
    quantity: pieceQty,
    meter_quantity: round2(meterQty),
    cost_value: round2(cost),
    sell_value: round2(sell),
  };
}
exports.aggregate = aggregate;

async function computeWarehouseValue(warehouseId) {
  const stock = await Stock.findAll({ where: { warehouse_id: warehouseId }, include: [Product] });
  return aggregate(stock);
}
exports.computeWarehouseValue = computeWarehouseValue;

exports.valueByWarehouse = async (req, res) => {
  try {
    res.json(await computeWarehouseValue(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalValue = async (req, res) => {
  try {
    const stock = await Stock.findAll({ include: [Product] });
    res.json(aggregate(stock));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.centralValue = async (req, res) => {
  try {
    const central = await Warehouse.findOne({ where: { type: 'central' } });
    if (!central) return res.json({ quantity: 0, meter_quantity: 0, cost_value: 0, sell_value: 0 });
    res.json(await computeWarehouseValue(central.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.branchesValue = async (req, res) => {
  try {
    const branchWarehouses = await Warehouse.findAll({ where: { type: 'branch' } });
    const ids = branchWarehouses.map((w) => w.id);
    const stock = ids.length
      ? await Stock.findAll({ where: { warehouse_id: ids }, include: [Product] })
      : [];
    res.json(aggregate(stock));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Per-product stock breakdown for one warehouse, in each product's native unit. */
exports.metersByWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.warehouseId);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

    // A branch manager may only inspect their own warehouse.
    if (req.user.role === 'branch'
      && !(warehouse.type === 'branch' && warehouse.branch_id === req.user.branch_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rows = await Stock.findAll({
      where: { warehouse_id: warehouse.id },
      include: [Product],
    });

    const items = rows
      .filter((r) => r.Product && (isMeterType(r.Product) ? parseFloat(r.meter_quantity) > 0 : r.quantity > 0))
      .map((r) => {
        const v = valueOf(r, r.Product);
        return {
          product_id: r.Product.id,
          name_uz: r.Product.name_uz,
          name_ru: r.Product.name_ru,
          size: r.Product.size,
          color: r.Product.color,
          unit_type: r.Product.unit_type,
          quantity: v.quantity,
          meter_quantity: v.meter_quantity,
          cost_value: v.cost,
          sell_value: v.sell,
        };
      });

    res.json({
      warehouse: { id: warehouse.id, name: warehouse.name, type: warehouse.type },
      totals: aggregate(rows),
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
