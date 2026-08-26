const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: true },
  // Exactly one of these is used, per the product's unit_type.
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  meter_quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  unit_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  supplier: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'purchases',
  underscored: true,
});

module.exports = Purchase;
