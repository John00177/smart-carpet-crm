const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Warehouse = sequelize.define('Warehouse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('central', 'branch'), allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'warehouses',
  underscored: true,
});

module.exports = Warehouse;
