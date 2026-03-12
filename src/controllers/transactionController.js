const Transaction = require('../models/Transaction');

// GET /transactions – liste (admin seulement)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().populate('paymentId');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /transactions/:id (admin)
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('paymentId');
    if (!transaction) return res.status(404).json({ error: 'Transaction non trouvée' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /transactions – (ne devrait pas être exposé, création via service interne)
// On peut l'utiliser pour enregistrer une transaction depuis un webhook
exports.createTransaction = async (req, res) => {
  try {
    const { paymentId, transactionId, type, amount, status, metadata } = req.body;
    const transaction = new Transaction({
      paymentId,
      transactionId,
      type,
      amount,
      status,
      metadata
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};