const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BranchSale = sequelize.define('BranchSale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  // Exactly one of these is used, per the product's unit_type.
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  meter_quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  sell_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
  sale_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  customer_name: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'branch_sales',
  underscored: true,
});

module.exports = BranchSale;
