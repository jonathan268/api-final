const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const transactionController = require('../controllers/transactionController');

router.use(auth, authorize('admin')); // seulement admin

router.get('/', transactionController.getAllTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction); // à sécuriser

module.exports = router;