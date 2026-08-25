const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/admin', authenticate, authorize('admin'), dashboardController.adminDashboard);
router.get('/branch', authenticate, authorize('branch'), dashboardController.branchDashboard);
router.get('/warehouse', authenticate, authorize('warehouse'), dashboardController.warehouseDashboard);

module.exports = router;
