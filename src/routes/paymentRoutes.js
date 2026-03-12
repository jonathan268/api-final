// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const paymentController = require('../controllers/paymentController');

// Routes protégées (nécessitent authentification)
router.post('/cinetpay/initiate', auth, paymentController.initiateCinetpayPayment);
router.get('/cinetpay/status/:transactionId', auth, paymentController.checkCinetpayStatus);

// Route publique pour le webhook CinetPay (IPN)
router.post(
  '/cinetpay-webhook',
  express.raw({ type: 'application/json' }), // ou express.json() si CinetPay envoie du JSON
  paymentController.cinetpayWebhook
);

// Route de retour (publique, car redirigée par CinetPay)
router.get('/return', paymentController.paymentReturn);

module.exports = router;