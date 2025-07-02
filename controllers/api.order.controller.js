// controllers/api.order.controller.js
const Base         = require('./base.controller');
const Order        = require('../models/order.model');
const OrderDetail  = require('../models/orderDetail.model');
const Product      = require('../models/product.model');

const controller = Base(Order);

// Override GET /orders/:id
controller.GetOne = async (req, res) => {
  try {
    // 1. Lấy order
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ msg: 'Order not found', data: null });
    }

    // 2. Lấy chi tiết & populate tên sản phẩm
    const details = await OrderDetail
      .find({ order_id: req.params.id })
      .populate('product_id', 'name')
      .lean();

    // 3. Format thành items
    const items = details.map(d => ({
      productName: d.product_id.name,
      quantity:    d.quantity,
      unitPrice:   d.price
    }));

    // 4. Trả về order + items
    res.json({ msg: 'OK', data: { ...order, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
