/**
 * One-off schema migration: adds the metre-tracking columns and backfills
 * meters_per_piece from each product's size label.
 *
 * Run inside the deployed container:
 *   railway ssh --service backend -- node migrate.js
 * Or locally (with backend/.env pointing at the target database):
 *   node migrate.js
 *
 * Uses sync({ alter: true }) deliberately rather than doing it on every boot,
 * because ALTER on startup is risky under multiple replicas.
 */
const sequelize = require('./src/config/database');
const { Product } = require('./src/models');
const { metersFromSize } = require('./src/utils/meters');

async function run() {
  await sequelize.authenticate();
  console.log('Database connected');

  await sequelize.sync({ alter: true });
  console.log('Schema altered (metre columns added)');

  // Backfill meters_per_piece for anything still on the default of 1,
  // deriving it from the size label ("4x6m" -> 24).
  const products = await Product.findAll();
  let updated = 0, skipped = 0;

  for (const p of products) {
    const current = parseFloat(p.meters_per_piece);
    if (isFinite(current) && current > 1) { skipped++; continue; }

    const derived = metersFromSize(p.size);
    if (derived) {
      await p.update({ meters_per_piece: derived });
      console.log(`  ${p.name_uz} (${p.size}) -> ${derived} m/piece`);
      updated++;
    } else {
      console.log(`  ${p.name_uz} (${p.size}) -> could not parse size, left at ${current}`);
      skipped++;
    }
  }

  console.log(`\nBackfill complete: ${updated} updated, ${skipped} left unchanged.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
