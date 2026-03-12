const OrderItem = require('../models/OrderItem');

// GET /order-items?orderId=xxx
exports.getItemsByOrder = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ error: 'orderId requis' });

    const items = await OrderItem.find({ orderId }).populate('productId');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};