const path = require('path');
const fs = require('fs');
const app = require('./app');
const sequelize = require('./config/database');
require('./models');

const PORT = process.env.PORT || 5000;

const clientBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(require('express').static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync();
    console.log('Models synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
}

start();
