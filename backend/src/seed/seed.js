const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { User, Product, Warehouse } = require('../models');
require('../models');

const users = [
  { name: 'Rich Man', email: 'admin@smartcarpet.uz', password: 'admin123', role: 'admin', branch_id: null },
  { name: 'Rich Man Son', email: 'son@smartcarpet.uz', password: 'admin123', role: 'admin', branch_id: null },
  { name: 'Warehouse Manager 1', email: 'warehouse1@smartcarpet.uz', password: 'warehouse123', role: 'warehouse', branch_id: null },
  { name: 'Warehouse Manager 2', email: 'warehouse2@smartcarpet.uz', password: 'warehouse123', role: 'warehouse', branch_id: null },
  { name: 'Davronbek', email: 'branch1@smartcarpet.uz', password: 'branch123', role: 'branch', branch_id: 1 },
  { name: 'Tursunboy', email: 'branch2@smartcarpet.uz', password: 'branch123', role: 'branch', branch_id: 2 },
  { name: 'Globus', email: 'branch3@smartcarpet.uz', password: 'branch123', role: 'branch', branch_id: 3 },
  { name: 'Branch 4', email: 'branch4@smartcarpet.uz', password: 'branch123', role: 'branch', branch_id: 4 },
  { name: 'Branch 5', email: 'branch5@smartcarpet.uz', password: 'branch123', role: 'branch', branch_id: 5 },
];

const warehouses = [
  { name: 'Central Warehouse', type: 'central', branch_id: null },
  { name: 'Davronbek Warehouse', type: 'branch', branch_id: 1 },
  { name: 'Tursunboy Warehouse', type: 'branch', branch_id: 2 },
  { name: 'Globus Warehouse', type: 'branch', branch_id: 3 },
  { name: 'Branch 4 Warehouse', type: 'branch', branch_id: 4 },
  { name: 'Branch 5 Warehouse', type: 'branch', branch_id: 5 },
];

const products = [
  { name_uz: 'Guliston', name_ru: 'Гулистан', size: '2x3m', color: 'Red', cost_price: 50, sell_price: 75, retail_price: 100 },
  { name_uz: 'Buxoro', name_ru: 'Бухара', size: '3x4m', color: 'Blue', cost_price: 80, sell_price: 120, retail_price: 160 },
  { name_uz: 'Samarqand', name_ru: 'Самарканд', size: '2x3m', color: 'Green', cost_price: 60, sell_price: 90, retail_price: 120 },
  { name_uz: 'Xiva', name_ru: 'Хива', size: '4x6m', color: 'Red', cost_price: 120, sell_price: 180, retail_price: 240 },
  { name_uz: 'Qashqadaryo', name_ru: 'Кашкадарья', size: '3x4m', color: 'Beige', cost_price: 70, sell_price: 105, retail_price: 140 },
  { name_uz: "Farg'ona", name_ru: 'Фергана', size: '2x3m', color: 'Brown', cost_price: 55, sell_price: 82, retail_price: 110 },
  { name_uz: 'Andijon', name_ru: 'Андижан', size: '3x5m', color: 'Gold', cost_price: 90, sell_price: 135, retail_price: 180 },
  { name_uz: 'Namangan', name_ru: 'Наманган', size: '2x2m', color: 'Blue', cost_price: 40, sell_price: 60, retail_price: 80 },
  { name_uz: 'Surxondaryo', name_ru: 'Сурхандарья', size: '4x4m', color: 'Red', cost_price: 100, sell_price: 150, retail_price: 200 },
  { name_uz: 'Jizzax', name_ru: 'Джизак', size: '2x3m', color: 'Green', cost_price: 45, sell_price: 67, retail_price: 90 },
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('Tables recreated');

    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({ ...u, password: hashed });
    }
    console.log('Users seeded');

    await Warehouse.bulkCreate(warehouses);
    console.log('Warehouses seeded');

    await Product.bulkCreate(products);
    console.log('Products seeded');

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
