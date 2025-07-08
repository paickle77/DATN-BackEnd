const Base       = require('./base.controller');
const Shipment   = require('../models/shipment.model');
const User       = require('../models/user.model');
const { sendEmail } = require('../utils/mail');
const { sendSMS }   = require('../utils/sms');

// Kế thừa CRUD từ Base, chỉ override Edit để thêm gửi mail/SMS
const controller = Base(Shipment);

// Ghi đè getList
controller.getList = async (req, res) => {
  try {
    const list = await Shipment
      .find()
      .populate('order_id', '_id user_id status')
      .populate('assignedTo', 'name');
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

controller.Edit = async (req, res) => {
  try {
    const updated = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('order_id')
    .populate('assignedTo');

    // Lấy thông tin khách hàng từ đơn hàng
    const customer = await User.findById(updated.order_id.user_id);
    if (req.body.status) {
      const msg = `Đơn hàng ${updated.order_id._id} hiện tại: ${req.body.status}`;
      await sendEmail(customer.email, 'Cập nhật giao hàng', msg);
      await sendSMS(customer.phone, msg);
    }

    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
