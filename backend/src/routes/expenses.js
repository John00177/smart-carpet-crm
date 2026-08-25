const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate, authorize } = require('../middleware/auth');

// Specific paths before /:id so they aren't swallowed by the param route.
router.get('/summary', authenticate, authorize('admin', 'branch'), expenseController.getSummary);
router.get('/category-breakdown', authenticate, authorize('admin', 'branch'), expenseController.getCategoryBreakdown);
router.get('/daily/total', authenticate, authorize('admin', 'branch'), expenseController.getDailyTotal);
router.get('/period/total', authenticate, authorize('admin', 'branch'), expenseController.getPeriodTotal);

router.get('/', authenticate, authorize('admin', 'branch'), expenseController.getAll);
router.post('/', authenticate, authorize('admin', 'branch'), expenseController.create);
router.delete('/:id', authenticate, authorize('admin', 'branch'), expenseController.remove);

module.exports = router;
