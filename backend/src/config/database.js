const { Sequelize } = require('sequelize');
require('dotenv').config();

const needsSSL = /sslmode=require|neon\.tech|render\.com|supabase\.co/.test(process.env.DATABASE_URL || '')
  || process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: needsSSL
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

module.exports = sequelize;
