const Base         = require('./base.controller');
const Shipment     = require('../models/shipment.model');
const Order        = require('../models/order.model');
const User         = require('../models/user.model');
const { sendEmail }= require('../utils/mail');
const { sendSMS }  = require('../utils/sms');

const controller = Base(Shipment);

controller.getList = async (req, res) => {
  try {
    const list = await Shipment
      .find()
      .populate('order_id','_id user_id status')
      .populate('assignedTo','name');
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

    // Thông báo khách
    const customer = await User.findById(updated.order_id.user_id);
    try {
        if (req.body.status) {
            const msg = `Đơn ${updated.order_id._id}: ${req.body.status}`;
            await sendEmail(customer.email, 'Cập nhật giao hàng', msg);
            await sendSMS(customer.phone, msg);
        }
        } catch(err) {
        console.error('Lỗi khi gửi mail/SMS:', err);
        // nhưng vẫn tiếp tục xử lý
        }

    // Nếu ship hoàn thành → cập nhật order
    if (req.body.status === 'Hoàn thành') {
      await Order.findByIdAndUpdate(
        updated.order_id._id,
        { status: 'Đã nhận hàng' },
        { new: true }
      );
    }

    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
