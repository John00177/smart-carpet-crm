const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'branch'), salesController.list);
router.get('/daily/total', authenticate, salesController.dailyTotal);
router.get('/period/total', authenticate, salesController.periodTotal);
router.get('/branch/:id', authenticate, authorize('admin'), salesController.byBranch);
router.post('/', authenticate, authorize('branch'), salesController.create);

module.exports = router;
