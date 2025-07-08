// controllers/api.order.controller.js
const Base        = require('./base.controller');
const Order       = require('../models/order.model');
const OrderDetail = require('../models/orderDetail.model');

const controller = Base(Order);

// Ghi đè GET /orders/:id
controller.GetOne = async (req, res) => {
  try {
    // 1) Lấy order chính
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ msg: 'Order không tồn tại', data: null });

    // 2) Lấy chi tiết order_details
    const details = await OrderDetail
      .find({ order_id: req.params.id })
      .populate('product_id', 'name')
      .lean();

    // 3) Map thành items với đúng trường productName, quantity, unitPrice
    const items = details.map(d => ({
      productName: d.product_id.name,
      quantity:    d.quantity,
      unitPrice:   d.price
    }));

    // 4) Trả về order + items
    res.json({ msg: 'OK', data: { ...order, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
