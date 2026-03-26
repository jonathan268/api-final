// controllers/cinetpayController.js
const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');

/**
 * Initialiser un paiement CinetPay
 */
exports.initiateCinetpayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // 1. Récupérer la commande et vérifier qu'elle appartient à l'utilisateur
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }
    if (order.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    // 2. Vérifier qu'aucun paiement n'est déjà en cours
    const existingPayment = await Payment.findOne({ 
      orderId, 
      status: { $in: ['PENDING', 'SUCCESS'] } 
    });
    if (existingPayment) {
      return res.status(400).json({ error: 'Un paiement existe déjà pour cette commande' });
    }

// 3. Générer un ID de transaction unique
    const transactionId = `ORDER_${orderId}_${Date.now()}`;

    // Vérifier que l'URL de base est définie
    if (!process.env.API_URL) {
      return res.status(500).json({ 
        error: 'Configuration serveur incomplète', 
        details: 'API_URL n\'est pas définie dans l\'environnement' 
      });
    }

    // 4. Préparer les données pour CinetPay [citation:4]
    const paymentData = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: order.totalAmount,
      currency: 'XOF', // ou XAF, CDF, GNF, USD selon votre besoin
      description: `Paiement commande ${orderId.slice(-8)}`,
      notify_url: `${process.env.API_URL}/api/payments/cinetpay-webhook`,
      return_url: `${process.env.FRONTEND_URL}/payment/return`,
      channels: 'ALL', // ALL, MOBILE_MONEY, CREDIT_CARD, WALLET
      lang: 'fr',
      metadata: JSON.stringify({ orderId, userId: req.user._id }),
      // Informations client requises pour les paiements par carte [citation:5]
      customer_id: req.user._id,
      customer_name: req.user.name.split(' ')[0] || 'Client',
      customer_surname: req.user.name.split(' ')[1] || '',
      customer_email: req.user.email,
      customer_phone_number: req.user.phone || '+22500000000',
      customer_address: req.user.address || 'Adresse non renseignée',
      customer_city: req.user.city || 'Abidjan',
      customer_country: 'CI', // Code ISO du pays
      customer_state: 'CI',
      customer_zip_code: '00000',
    };

    // 5. Sauvegarder le paiement en base (important pour la traçabilité) [citation:4]
    const payment = new Payment({
      userId: req.user._id,
      orderId: order._id,
      montant: order.totalAmount,
      status: 'PENDING',
      paymentMethod: 'cinetpay',
      cinetpayTransactionId: transactionId,
    });
    await payment.save();

    // 6. Appeler l'API CinetPay [citation:4]
    const response = await axios.post(
      'https://api-checkout.cinetpay.com/v2/payment',
      paymentData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    // 7. Analyser la réponse
    if (response.data.code === '201' || response.data.code === 201) {
      // Succès : mise à jour du paiement avec l'URL de paiement
      payment.cinetpayPaymentToken = response.data.data.payment_token;
      payment.cinetpayPaymentUrl = response.data.data.payment_url;
      await payment.save();

      return res.json({
        success: true,
        paymentUrl: response.data.data.payment_url,
        paymentId: payment._id,
      });
    } else {
      // Erreur côté CinetPay
      payment.status = 'FAILED';
      payment.errorMessage = response.data.description || 'Erreur inconnue';
      await payment.save();

      return res.status(400).json({
        error: 'Erreur lors de l\'initialisation du paiement',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Erreur CinetPay:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Webhook pour recevoir les notifications de CinetPay (IPN) [citation:3]
 */
exports.cinetpayWebhook = async (req, res) => {
  try {
    // Récupérer les données envoyées par CinetPay
    const {
      cpm_trans_id,
      cpm_amount,
      cpm_currency,
      cpm_payid,
      cpm_payment_date,
      cpm_payment_time,
      cpm_error_message,
      cpm_result,
      cpm_trans_status,
      payment_method,
      cel_phone_num,
      buyer_name,
      signature,
    } = req.body;

    // Vérifier la signature HMAC pour sécuriser le webhook [citation:2]
    const secret = process.env.CINETPAY_SECRET_KEY;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Alternative : CinetPay envoie la signature dans l'en-tête 'x-token'
    const headerSignature = req.headers['x-token'];
    
    // Vérifier la signature (selon la méthode utilisée par CinetPay)
    const isValid = headerSignature === computedSignature || signature === computedSignature;
    
    if (!isValid && process.env.CINETPAY_MODE === 'PROD') {
      console.error('Signature invalide pour le webhook CinetPay');
      return res.status(401).json({ error: 'Signature invalide' });
    }

    // Trouver le paiement correspondant
    const payment = await Payment.findOne({ cinetpayTransactionId: cpm_trans_id });
    if (!payment) {
      console.error('Paiement non trouvé pour transaction:', cpm_trans_id);
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    // Mettre à jour le paiement
    payment.status = cpm_result === '00' ? 'SUCCESS' : 'FAILED';
    payment.cinetpayPayId = cpm_payid;
    payment.paymentMethod = payment_method;
    payment.paymentDate = new Date(`${cpm_payment_date} ${cpm_payment_time}`);
    payment.errorMessage = cpm_error_message;
    payment.buyerPhone = cel_phone_num;
    payment.buyerName = buyer_name;
    await payment.save();

    // Si le paiement est réussi, mettre à jour la commande et créer une transaction
    if (cpm_result === '00') {
      // Mettre à jour le statut de la commande
      await Order.findByIdAndUpdate(payment.orderId, { status: 'paid' });

      // Créer une transaction dans notre historique
      const transaction = new Transaction({
        paymentId: payment._id,
        transactionId: cpm_payid,
        type: 'PAYMENT',
        amount: parseInt(cpm_amount),
        status: 'success',
        metadata: req.body,
      });
      await transaction.save();

      console.log(` Paiement CinetPay réussi pour commande ${payment.orderId}`);
    } else {
      console.log(` Paiement CinetPay échoué pour commande ${payment.orderId}: ${cpm_error_message}`);
    }

    // Répondre à CinetPay pour accuser réception
    res.status(200).json({ message: 'Webhook reçu' });
  } catch (error) {
    console.error('Erreur webhook CinetPay:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Vérifier le statut d'une transaction CinetPay [citation:2]
 */
exports.checkTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const response = await axios.post(
      'https://api-checkout.cinetpay.com/v2/payment/check',
      {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Erreur vérification transaction:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Page de retour après paiement (optionnel)
 */
exports.paymentReturn = async (req, res) => {
  try {
    const { transaction_id } = req.query;
    
    // Vérifier le statut de la transaction
    const payment = await Payment.findOne({ cinetpayTransactionId: transaction_id })
      .populate('orderId');
    
    if (!payment) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Transaction introuvable`);
    }

    if (payment.status === 'SUCCESS') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${payment.orderId._id}`);
    } else if (payment.status === 'FAILED') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Paiement échoué`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/pending`);
    }
  } catch (error) {
    console.error('Erreur retour paiement:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
};