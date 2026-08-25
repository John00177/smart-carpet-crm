const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/my', authenticate, authorize('branch'), warehouseController.my);
router.get('/', authenticate, authorize('admin', 'warehouse'), warehouseController.list);
router.get('/:id', authenticate, warehouseController.get);
router.post('/', authenticate, authorize('admin'), warehouseController.create);

module.exports = router;
