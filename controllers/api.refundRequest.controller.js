// controllers/api.refundRequest.controller.js
const Base = require('./base.controller');
const RefundRequest = require('../models/refundRequest.model');
const Bill = require('../models/bill.model');
const { processRefund } = require('../utils/payment');

const controller = Base(RefundRequest);

// GET /refund_requests - Danh sách yêu cầu hoàn trả với thông tin hóa đơn và nhân viên xử lý
controller.GetList = async (req, res) => {
  try {
    const list = await RefundRequest.find()
      .populate('bill_id', 'status total user_id')
      .populate('customer_id', 'name')
      .populate('processed_by', 'name');
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// PUT /refund_requests/:id - Cập nhật trạng thái yêu cầu hoàn trả
controller.Edit = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await RefundRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        processed_by: req.user?._id,
        processed_at: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ msg: 'Yêu cầu không tồn tại', data: null });
    }

    // Nếu admin chấp nhận hoàn trả
    if (status === 'accepted') {
      // 1) Cập nhật hóa đơn
      await Bill.findByIdAndUpdate(
        updated.bill_id,
        { status: 'done' },
        { new: true }
      );

      // 2) Gọi payment gateway hoàn tiền
      const amount = updated.refund_amount || 0;
      await processRefund(updated.bill_id, amount);
    }

    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};



module.exports = controller;