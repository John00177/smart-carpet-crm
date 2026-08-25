const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'warehouse'), purchaseController.list);
router.get('/daily/total', authenticate, authorize('admin', 'warehouse'), purchaseController.dailyTotal);
router.get('/period/total', authenticate, authorize('admin', 'warehouse'), purchaseController.periodTotal);
router.post('/', authenticate, authorize('warehouse'), purchaseController.create);

module.exports = router;
