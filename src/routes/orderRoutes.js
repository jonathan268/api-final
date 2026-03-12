const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const orderController = require('../controllers/orderController');

router.use(auth); // toutes les routes nécessitent une authentification

router.get('/', orderController.getOrders);
router.post('/', orderController.createOrder);
router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);
router.put('/:id/status', authorize('admin'), orderController.updateOrderStatus);

module.exports = router;