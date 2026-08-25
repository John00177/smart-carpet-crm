const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stock = sequelize.define('Stock', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'stock',
  underscored: true,
  indexes: [
    { unique: true, fields: ['warehouse_id', 'product_id'] },
  ],
});

module.exports = Stock;
