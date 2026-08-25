const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'warehouse'), transferController.list);
router.get('/warehouse/:id', authenticate, transferController.byWarehouse);
router.post('/', authenticate, authorize('warehouse'), transferController.create);

module.exports = router;
