const { Stock, Product, Warehouse } = require('../models');

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

async function computeWarehouseValue(warehouseId) {
  const stock = await Stock.findAll({ where: { warehouse_id: warehouseId }, include: [Product] });
  let qty = 0, cost = 0, sell = 0;
  for (const row of stock) {
    const q = row.quantity;
    qty += q;
    cost += q * parseFloat(row.Product.cost_price);
    sell += q * parseFloat(row.Product.sell_price);
  }
  return { quantity: qty, cost_value: cost, sell_value: sell };
}
exports.computeWarehouseValue = computeWarehouseValue;

exports.valueByWarehouse = async (req, res) => {
  try {
    const value = await computeWarehouseValue(req.params.id);
    res.json(value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.totalValue = async (req, res) => {
  try {
    const stock = await Stock.findAll({ include: [Product] });
    let qty = 0, cost = 0, sell = 0;
    for (const row of stock) {
      qty += row.quantity;
      cost += row.quantity * parseFloat(row.Product.cost_price);
      sell += row.quantity * parseFloat(row.Product.sell_price);
    }
    res.json({ quantity: qty, cost_value: cost, sell_value: sell });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.centralValue = async (req, res) => {
  try {
    const central = await Warehouse.findOne({ where: { type: 'central' } });
    if (!central) return res.json({ quantity: 0, cost_value: 0, sell_value: 0 });
    const value = await computeWarehouseValue(central.id);
    res.json(value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.branchesValue = async (req, res) => {
  try {
    const branchWarehouses = await Warehouse.findAll({ where: { type: 'branch' } });
    const ids = branchWarehouses.map((w) => w.id);
    const stock = await Stock.findAll({ where: { warehouse_id: ids }, include: [Product] });
    let qty = 0, cost = 0, sell = 0;
    for (const row of stock) {
      qty += row.quantity;
      cost += row.quantity * parseFloat(row.Product.cost_price);
      sell += row.quantity * parseFloat(row.Product.sell_price);
    }
    res.json({ quantity: qty, cost_value: cost, sell_value: sell });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
