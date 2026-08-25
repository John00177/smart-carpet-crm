const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { CATEGORY_KEYS } = require('../constants/expenseCategories');

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.ENUM(...CATEGORY_KEYS), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'USD' },
  expense_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  description: { type: DataTypes.STRING(255), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'expenses',
  underscored: true,
  indexes: [
    { fields: ['branch_id', 'expense_date'] },
  ],
});

module.exports = Expense;
