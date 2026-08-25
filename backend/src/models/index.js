const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Warehouse = require('./Warehouse');
const Stock = require('./Stock');
const Purchase = require('./Purchase');
const Transfer = require('./Transfer');
const TransferItem = require('./TransferItem');
const BranchSale = require('./BranchSale');
const Payment = require('./Payment');
const Expense = require('./Expense');

// Stock belongs to Warehouse & Product
Stock.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
Stock.belongsTo(Product, { foreignKey: 'product_id' });
Warehouse.hasMany(Stock, { foreignKey: 'warehouse_id' });
Product.hasMany(Stock, { foreignKey: 'product_id' });

// Purchase belongs to Product & created_by User
Purchase.belongsTo(Product, { foreignKey: 'product_id' });
Purchase.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Transfer belongs to Warehouses & created_by User
Transfer.belongsTo(Warehouse, { foreignKey: 'from_warehouse_id', as: 'fromWarehouse' });
Transfer.belongsTo(Warehouse, { foreignKey: 'to_warehouse_id', as: 'toWarehouse' });
Transfer.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Transfer.hasMany(TransferItem, { foreignKey: 'transfer_id', as: 'items' });
TransferItem.belongsTo(Transfer, { foreignKey: 'transfer_id' });
TransferItem.belongsTo(Product, { foreignKey: 'product_id' });

// BranchSale belongs to Product
BranchSale.belongsTo(Product, { foreignKey: 'product_id' });

// Expense is keyed by the logical branch id (1..5), which matches User.branch_id
// rather than User.id — so the join needs an explicit targetKey.
Expense.belongsTo(User, { foreignKey: 'branch_id', targetKey: 'branch_id', as: 'branchUser', constraints: false });
Expense.belongsTo(User, { foreignKey: 'created_by', as: 'creator', constraints: false });

module.exports = {
  sequelize,
  User,
  Product,
  Warehouse,
  Stock,
  Purchase,
  Transfer,
  TransferItem,
  BranchSale,
  Payment,
  Expense,
};
