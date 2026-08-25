const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, productController.list);
router.get('/:id', authenticate, productController.get);
router.post('/', authenticate, authorize('admin', 'warehouse'), productController.create);
router.put('/:id', authenticate, authorize('admin', 'warehouse'), productController.update);
router.delete('/:id', authenticate, authorize('admin'), productController.remove);

module.exports = router;
