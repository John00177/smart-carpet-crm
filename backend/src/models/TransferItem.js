const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransferItem = sequelize.define('TransferItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  transfer_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  // Exactly one of these is used, per the product's unit_type: piece
  // products populate quantity and leave meter_quantity at 0, and vice versa.
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  meter_quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  unit_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit_sell: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
  tableName: 'transfer_items',
  underscored: true,
});

module.exports = TransferItem;
