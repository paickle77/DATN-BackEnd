// controllers/api.voucherUserAdmin.controller.js
const VoucherUser = require('../models/voucher_user.model');

exports.adminList = async (req, res) => {
  try {
    const data = await VoucherUser.find()
      .populate('Account_id', 'full_name email phone') // tuỳ field trong Account
      .populate('voucher_id', 'code discount_percent max_usage_per_user start_date end_date')
      .sort('-createdAt')
      .lean();

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

// PUT /voucher_users/:id  { status }
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const doc = await VoucherUser.findByIdAndUpdate(id, { status }, { new: true });
    if (!doc) return res.status(404).json({ success: false, msg: 'Không tìm thấy record' });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await VoucherUser.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};
