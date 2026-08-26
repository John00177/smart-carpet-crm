const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stock = sequelize.define('Stock', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  // Exactly one of these is ever non-zero for a given row, decided by the
  // product's unit_type: 'piece' products use quantity, 'meter' products
  // use meter_quantity. The two are never converted between each other.
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  meter_quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'stock',
  underscored: true,
  indexes: [
    { unique: true, fields: ['warehouse_id', 'product_id'] },
  ],
});

module.exports = Stock;
