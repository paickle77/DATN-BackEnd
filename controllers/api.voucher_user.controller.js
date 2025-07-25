// controllers/api.voucher_user.controller.js
const Base        = require('./base.controller');
const VoucherUser = require('../models/voucher_user.model');

const controller = Base(VoucherUser);

// ghi đè getList để luôn populate cả user & voucher
controller.getList = async (req, res) => {
  try {
    const list = await VoucherUser.find()
      .populate('user_id', 'name email')
      .populate('voucher_id', 'code discount_percent')
      .lean();
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// giữ nguyên 2 method cho mobile
controller.GetAllVoucher_user = async (req, res) => {
  try {
    const result = await VoucherUser.find()
      .populate('voucher_id')
      .exec();
    res.json({ msg: 'OK', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

controller.GetVoucherUserByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const docs = await VoucherUser.find({ user_id: userId })
      .populate('voucher_id')
      .exec();
    return res.json({
      success: true,
      message: 'Lấy danh sách voucher của user thành công.',
      data: docs,
    });
  } catch (err) {
    console.error('GetVoucherUserByUserId error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = controller;
