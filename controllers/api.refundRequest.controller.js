const Base          = require('./base.controller');
const RefundRequest = require('../models/refundRequest.model');
const Order         = require('../models/order.model');
const { processRefund } = require('../utils/payment');

const controller = Base(RefundRequest);

// Populate thêm order và processed_by
controller.GetList = async (req, res) => {
  try {
    const list = await RefundRequest.find()
      .populate('order_id', 'status total_price')
      .populate('processed_by', 'name');
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// Xử lý cập nhật trạng thái
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
    if (status === 'Đã chấp nhận') {
      // 1) Cập nhật order
      await Order.findByIdAndUpdate(
        updated.order_id,
        { status: 'Đã trả hàng' },
        { new: true }
      );

      // 2) Gọi payment gateway với đúng số tiền cần hoàn
      const amount = updated.refund_amount || 0;
      await processRefund(updated.order_id, amount);
    }

    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
