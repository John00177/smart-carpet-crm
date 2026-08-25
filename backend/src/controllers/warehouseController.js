const { Warehouse } = require('../models');

exports.list = async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({ order: [['id', 'ASC']] });
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.my = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ where: { type: 'branch', branch_id: req.user.branch_id } });
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found for this branch' });
    res.json(warehouse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
    res.json(warehouse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, type, branch_id, address } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    const warehouse = await Warehouse.create({ name, type, branch_id, address });
    res.status(201).json(warehouse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
