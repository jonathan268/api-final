const Order = require('../models/Order');
const Product = require('../models/Product');

// GET /orders
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = {};

    // Si utilisateur normal, ne voir que ses commandes
    if (!req.user.roles?.some(r => r.name === 'admin')) {
      filter.userId = req.user._id;
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .populate('items.productId')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('items.productId');

    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    // Vérification des droits
    if (!req.user.roles?.some(r => r.name === 'admin') && order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /orders – créer une commande à partir du panier (simplifié)
exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body; // items: [{ productId, quantity }]
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    // Vérifier les produits et calculer le total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Produit ${item.productId} introuvable` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuffisant pour ${product.name}` });
      }

      // Réduire le stock (à faire après validation de la commande ? On le fait ici)
      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      });
      totalAmount += product.price * item.quantity;
    }

    const order = new Order({
      userId: req.user._id,
      items: orderItems,
      totalAmount,
      status: 'pending'
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /orders/:id/cancel – annuler une commande (si en attente)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    // Vérifier droits
    const isAdmin = req.user.roles?.some(r => r.name === 'admin');
    if (!isAdmin && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Seules les commandes en attente peuvent être annulées' });
    }

    // Restaurer les stocks
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }

    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /orders/:id/status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};