const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name_uz: { type: DataTypes.STRING, allowNull: false },
  name_ru: { type: DataTypes.STRING, allowNull: false },
  size: { type: DataTypes.STRING, allowNull: false },
  color: { type: DataTypes.STRING, allowNull: false },
  cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  sell_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  retail_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'products',
  underscored: true,
});

module.exports = Product;
