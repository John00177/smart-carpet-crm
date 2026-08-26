/**
 * One-off schema migration: adds Product.unit_type ('piece' | 'meter') and
 * confirms Stock.quantity/meter_quantity are in place for the piece/meter
 * split stock model (each product uses exactly one of the two fields).
 *
 * Run inside the deployed container:
 *   railway ssh --service backend -- node migrate.js
 * Or locally (with backend/.env pointing at the target database):
 *   node migrate.js
 *
 * Uses sync({ alter: true }) deliberately rather than doing it on every boot,
 * because ALTER on startup is risky under multiple replicas. Existing
 * products default to unit_type = 'piece' (Postgres backfills the column
 * default onto existing rows), matching how they were tracked before.
 */
const sequelize = require('./src/config/database');
const { Product } = require('./src/models');

async function run() {
  await sequelize.authenticate();
  console.log('Database connected');

  await sequelize.sync({ alter: true });
  console.log('Schema altered: unit_type added, Stock/TransferItem/BranchSale/Purchase quantity columns confirmed');

  const counts = await Product.findAll({ attributes: ['unit_type'] });
  const byType = counts.reduce((acc, p) => {
    acc[p.unit_type] = (acc[p.unit_type] || 0) + 1;
    return acc;
  }, {});
  console.log('Products by unit_type:', byType);

  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
