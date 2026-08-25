const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transfer = sequelize.define('Transfer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  from_warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  to_warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total_sell_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
  transfer_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'transfers',
  underscored: true,
});

module.exports = Transfer;
