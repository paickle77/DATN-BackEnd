// controllers/api.voucherUserAdmin.controller.js
const Base       = require('./base.controller');
const VoucherUser= require('../models/voucher_user.model');

const controller = Base(VoucherUser);

// GET /admin/voucher_users — danh sách kèm user & voucher (admin)
controller.getList = async (req, res) => {
  try {
    const list = await VoucherUser.find()
      .populate('user_id',    'name email')
      .populate('voucher_id', 'code description discount_percent')
      .lean();
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};

// PUT /admin/voucher_users/:id — chỉ cho admin đổi status
controller.Edit = async (req, res) => {
  try {
    const { status } = req.body;
    const updateDoc = { status };
    if (status === 'used') {
      updateDoc.used_date = new Date();
    }
    const updated = await VoucherUser.findByIdAndUpdate(
      req.params.id,
      updateDoc,
      { new: true, runValidators: true }
    )
    .populate('user_id','name email')
    .populate('voucher_id','code discount_percent');
    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};

module.exports = controller;
