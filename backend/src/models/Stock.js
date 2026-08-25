const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stock = sequelize.define('Stock', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  // Metres are the source of truth for stock level and value.
  // `quantity` is the piece equivalent, kept in sync as meters / meters_per_piece,
  // so it is decimal (selling 20m off a 6m carpet leaves a fractional piece count).
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  meter_quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'stock',
  underscored: true,
  indexes: [
    { unique: true, fields: ['warehouse_id', 'product_id'] },
  ],
});

module.exports = Stock;
