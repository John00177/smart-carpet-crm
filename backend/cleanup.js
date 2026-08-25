/**
 * Wipes transactional/mock data and zeroes all stock, leaving the
 * configuration data (users, warehouses, products) untouched.
 *
 * Run inside the deployed container:
 *   railway ssh --service backend -- node cleanup.js
 *
 * NOTE: `railway run node cleanup.js` will NOT work — it executes locally with
 * the production env, and DATABASE_URL points at Railway's private network
 * hostname, which is unreachable from outside. Use `railway ssh` instead.
 *
 * This is destructive. Pass --yes to skip the confirmation delay.
 */
const sequelize = require('./src/config/database');
const {
  Payment, Transfer, TransferItem, BranchSale, Purchase, Expense, Stock,
  User, Warehouse, Product,
} = require('./src/models');

async function run() {
  await sequelize.authenticate();
  console.log('Database connected\n');

  const before = {
    payments: await Payment.count(),
    transfers: await Transfer.count(),
    transfer_items: await TransferItem.count(),
    branch_sales: await BranchSale.count(),
    purchases: await Purchase.count(),
    expenses: await Expense.count(),
    stock_rows: await Stock.count(),
  };
  console.log('Current transactional data:', before);

  const keep = {
    users: await User.count(),
    warehouses: await Warehouse.count(),
    products: await Product.count(),
  };
  console.log('Will be preserved:', keep, '\n');

  if (!process.argv.includes('--yes')) {
    console.log('Deleting in 5s... (Ctrl+C to abort, or pass --yes to skip this wait)');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Child rows first so foreign keys never dangle.
  const t = await sequelize.transaction();
  try {
    await TransferItem.destroy({ where: {}, transaction: t });
    await Transfer.destroy({ where: {}, transaction: t });
    await Payment.destroy({ where: {}, transaction: t });
    await BranchSale.destroy({ where: {}, transaction: t });
    await Purchase.destroy({ where: {}, transaction: t });
    await Expense.destroy({ where: {}, transaction: t });

    // Zero stock rather than deleting, so warehouse/product pairings survive.
    await Stock.update({ quantity: 0, meter_quantity: 0 }, { where: {}, transaction: t });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const after = {
    payments: await Payment.count(),
    transfers: await Transfer.count(),
    transfer_items: await TransferItem.count(),
    branch_sales: await BranchSale.count(),
    purchases: await Purchase.count(),
    expenses: await Expense.count(),
    users: await User.count(),
    warehouses: await Warehouse.count(),
    products: await Product.count(),
  };

  const stockSum = await Stock.findAll();
  const totalQty = stockSum.reduce((s, r) => s + parseFloat(r.quantity), 0);
  const totalMeters = stockSum.reduce((s, r) => s + parseFloat(r.meter_quantity), 0);

  console.log('\nCleanup complete.');
  console.log('Remaining rows:', after);
  console.log(`Stock totals: ${totalQty} pieces / ${totalMeters} meters (both should be 0)`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
