const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'branch'), paymentController.list);
router.get('/debts/all', authenticate, authorize('admin'), paymentController.allDebts);
router.get('/debt/:branchId', authenticate, paymentController.debtForBranch);
router.get('/daily/total', authenticate, authorize('admin'), paymentController.dailyTotal);
router.get('/period/total', authenticate, authorize('admin'), paymentController.periodTotal);
router.get('/branch/:id', authenticate, paymentController.byBranch);
router.post('/', authenticate, authorize('admin', 'branch'), paymentController.create);

module.exports = router;
