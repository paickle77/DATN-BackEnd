// src/controllers/api.refundRequest.controller.js

const Base           = require('./base.controller');
const RefundRequest  = require('../models/refundRequest.model');

// 1) Khởi tạo CRUD mặc định
const controller = Base(RefundRequest);

// 2) Override LIST để populate thêm order và processed_by
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

// 3) Override EDIT (PUT) để cập nhật status và thông tin processed_by/processed_at
controller.Edit = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await RefundRequest.findByIdAndUpdate(
      req.params.id,
      { status, processed_by: req.user?._id, processed_at: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ msg: 'Yêu cầu không tồn tại', data: null });
    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// 4) (Tuỳ chọn) bạn có thể xài luôn Base Add để tạo mới, hoặc override nếu muốn kiểm tra thêm
// controller.Add = controller.Add; // đã có sẵn

module.exports = controller;
