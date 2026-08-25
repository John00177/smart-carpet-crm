const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'warehouse'), stockController.list);
router.get('/total/value', authenticate, authorize('admin', 'warehouse'), stockController.totalValue);
router.get('/central/value', authenticate, authorize('admin', 'warehouse'), stockController.centralValue);
router.get('/branches/value', authenticate, authorize('admin', 'warehouse'), stockController.branchesValue);
router.get('/warehouse/:id', authenticate, stockController.byWarehouse);
router.get('/value/:id', authenticate, stockController.valueByWarehouse);

module.exports = router;
