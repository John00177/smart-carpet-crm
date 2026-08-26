const { Product } = require('../models');

exports.list = async (req, res) => {
  try {
    const products = await Product.findAll({ where: { is_active: true }, order: [['name_uz', 'ASC']] });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      name_uz, name_ru, size, color, cost_price, sell_price, retail_price, unit_type,
    } = req.body;
    if (!name_uz || !name_ru || !size || !color || cost_price == null || sell_price == null || retail_price == null) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (unit_type && !['piece', 'meter'].includes(unit_type)) {
      return res.status(400).json({ error: "unit_type must be 'piece' or 'meter'" });
    }
    const product = await Product.create({
      name_uz, name_ru, size, color, cost_price, sell_price, retail_price,
      unit_type: unit_type || 'piece',
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    // unit_type decides which stock field every downstream record uses, so
    // it is fixed at creation and cannot be changed afterwards.
    const { unit_type, ...rest } = req.body;
    await product.update(rest);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.update({ is_active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
