// controllers/paymentController.js
const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');


exports.initiateCinetpayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    //  Récupérer la commande avec les détails produits
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }
    // Vérifier que la commande appartient à l'utilisateur connecté
    if (order.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Accès interdit à cette commande' });
    }
    // Vérifier que la commande est en statut "pending"
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Cette commande ne peut pas être payée' });
    }

    //  Vérifier qu'un paiement n'est pas déjà en cours pour cette commande
    const existingPayment = await Payment.findOne({ 
      orderId, 
      status: { $in: ['PENDING', 'SUCCESS'] } 
    });
    if (existingPayment) {
      return res.status(400).json({ error: 'Un paiement est déjà associé à cette commande' });
    }

//  Générer un identifiant de transaction unique (pour CinetPay)
    const transactionId = `ORDER_${orderId}_${Date.now()}`;

    // Vérifier que l'URL de base est définie
    if (!process.env.API_URL) {
      return res.status(500).json({ 
        error: 'Configuration serveur incomplète', 
        details: 'API_URL n\'est pas définie dans l\'environnement' 
      });
    }

    //  Préparer les données pour l'API CinetPay
    const paymentData = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: order.totalAmount,
      currency: 'XAF',                 
      description: `Paiement commande ${orderId.slice(-8)}`,
      notify_url: `${process.env.API_URL}/api/payments/cinetpay-webhook`,  // URL de votre webhook
      return_url: `${process.env.FRONTEND_URL}/payment/return`,            // Page de retour frontend
      channels: 'ALL',                  // 'ALL' pour accepter tous les moyens
      lang: 'fr',
      metadata: JSON.stringify({ orderId, userId: req.user._id }),         // Données supplémentaires
      // Informations client (obligatoires pour certains moyens)
      customer_id: req.user._id,
      customer_name: req.user.name.split(' ')[0] || 'Client',
      customer_surname: req.user.name.split(' ')[1] || '',
      customer_email: req.user.email,
      customer_phone_number: req.user.phone || '+22500000000',              // Adaptez
      customer_address: req.user.address || 'Adresse non renseignée',
      customer_city: req.user.city || 'Abidjan',
      customer_country: 'CM',            // Code ISO du pays (CI, SN, BF...)
      customer_state: 'CM',
      customer_zip_code: '00000',
    };

    //  Créer une entrée Payment dans notre base (statut PENDING)
    const payment = new Payment({
      userId: req.user._id,
      orderId: order._id,
      montant: order.totalAmount,
      status: 'PENDING',
      paymentMethod: 'cinetpay',
      cinetpayTransactionId: transactionId,
    });
    await payment.save();

    //  Appeler l'API CinetPay pour initialiser le paiement
    const response = await axios.post(
      'https://api-checkout.cinetpay.com/v2/payment',
      paymentData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    //  Analyser la réponse
    if (response.data.code === '201' || response.data.code === 201) {
      // Succès : mise à jour du paiement avec l'URL et le token
      payment.cinetpayPaymentToken = response.data.data.payment_token;
      payment.cinetpayPaymentUrl = response.data.data.payment_url;
      await payment.save();

      return res.json({
        success: true,
        paymentUrl: response.data.data.payment_url,   // URL vers laquelle rediriger l'utilisateur
        paymentId: payment._id,
      });
    } else {
      // Échec de l'initialisation
      payment.status = 'FAILED';
      payment.errorMessage = response.data.description || 'Erreur inconnue';
      await payment.save();

      return res.status(400).json({
        error: 'Erreur lors de l\'initialisation du paiement',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Erreur CinetPay (initiation):', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * WEBHOOK CINETPAY (IPN)
 * Reçoit les notifications de CinetPay après un paiement
 * Cette route doit être publique (sans middleware auth)
 */
exports.cinetpayWebhook = async (req, res) => {
  try {
    // Les données sont envoyées en POST (format JSON ou form-urlencoded)
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

    // Vérification de la signature HMAC-SHA256 (sécurité)
    const secret = process.env.CINETPAY_SECRET_KEY;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // CinetPay peut envoyer la signature dans le header 'x-token' ou dans le body 'signature'
    const headerSignature = req.headers['x-token'];
    const isValid = headerSignature === computedSignature || signature === computedSignature;

    // En production, rejeter si la signature est invalide
    if (!isValid && process.env.CINETPAY_MODE === 'PROD') {
      console.error('Signature webhook CinetPay invalide');
      return res.status(401).json({ error: 'Signature invalide' });
    }

    // Trouver le paiement correspondant dans notre base
    const payment = await Payment.findOne({ cinetpayTransactionId: cpm_trans_id });
    if (!payment) {
      console.error('Paiement non trouvé pour transaction:', cpm_trans_id);
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    // Mise à jour du paiement
    payment.status = cpm_result === '00' ? 'SUCCESS' : 'FAILED';
    payment.cinetpayPayId = cpm_payid;
    payment.paymentMethod = payment_method;
    payment.paymentDate = new Date(`${cpm_payment_date} ${cpm_payment_time}`);
    payment.errorMessage = cpm_error_message;
    payment.buyerPhone = cel_phone_num;
    payment.buyerName = buyer_name;
    await payment.save();

    // Si paiement réussi, mettre à jour la commande et créer une transaction
    if (cpm_result === '00') {
      await Order.findByIdAndUpdate(payment.orderId, { status: 'paid' });

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
 * VÉRIFIER LE STATUT D'UNE TRANSACTION CINETPAY
 * Utilisé par le frontend pour interroger le statut après redirection
 */
exports.checkCinetpayStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Vérifier que l'utilisateur a accès à cette transaction
    const payment = await Payment.findOne({ cinetpayTransactionId: transactionId });
    if (!payment) {
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }
    // Vérifier que le paiement appartient à l'utilisateur connecté
    const order = await Order.findById(payment.orderId);
    if (order.userId.toString() !== req.user._id && !req.user.roles?.some(r => r.name === 'admin')) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    // Appeler l'API CinetPay pour obtenir le statut actuel
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
 * PAGE DE RETOUR APRÈS PAIEMENT (optionnel)
 * Redirige vers le frontend avec le résultat
 */
exports.paymentReturn = async (req, res) => {
  try {
    const { transaction_id, status } = req.query; // CinetPay peut passer des paramètres

    if (!transaction_id) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Transaction manquante`);
    }

    const payment = await Payment.findOne({ cinetpayTransactionId: transaction_id }).populate('orderId');
    if (!payment) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Transaction introuvable`);
    }

    if (payment.status === 'SUCCESS') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${payment.orderId._id}`);
    } else if (payment.status === 'FAILED') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Paiement échoué`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/pending?transactionId=${transaction_id}`);
    }
  } catch (error) {
    console.error('Erreur retour paiement:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
};