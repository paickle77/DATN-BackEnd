// controllers/api.order.controller.js
const Base       = require('./base.controller');
const Order      = require('../models/order.model');
const Shipment   = require('../models/shipment.model');

const controller = Base(Order);

// Ghi đè PUT /orders/:id
controller.Edit = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ msg: 'Order không tồn tại', data: null });
    }
    // Nếu admin duyệt đơn
    if (req.body.status === 'Đã xác nhận') {
        await Shipment.create({
          order_id:    updatedOrder._id,
          status:      'Đang giao'
        });
    }
    res.json({ msg: 'OK', data: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
