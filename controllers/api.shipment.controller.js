// controllers/api.shipment.controller.js
const Base = require('./base.controller');
const Shipment = require('../models/shipment.model');
const Bill = require('../models/bill.model');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/mail');
const { sendSMS } = require('../utils/sms');

const controller2 = Base(Shipment);

// GET /shipments - Danh sách lô giao hàng với thông tin hóa đơn và nhân viên
controller2.getList = async (req, res) => {
  try {
    const list = await Shipment.find()
      .populate('bill_id', '_id user_id status')
      .populate('assignedTo', 'name');
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// PUT /shipments/:id - Cập nhật trạng thái giao hàng và thông báo
controller2.Edit = async (req, res) => {
  try {
    const updated = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('bill_id')
    .populate('assignedTo');

    // Thông báo khách hàng
    const customer = await User.findById(updated.bill_id.user_id);
    try {
      if (req.body.status) {
        const msg = `Hóa đơn ${updated.bill_id._id}: ${req.body.status}`;
        await sendEmail(customer.email, 'Cập nhật giao hàng', msg);
        await sendSMS(customer.phone, msg);
      }
    } catch (err2) {
      console.error('Lỗi khi gửi mail/SMS:', err2);
    }

    // Nếu giao hoàn thành → cập nhật hóa đơn
    if (req.body.status === 'done') {
      await Bill.findByIdAndUpdate(
        updated.bill_id._id,
        { status: 'done' },
        { new: true }
      );
    }

    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller2;