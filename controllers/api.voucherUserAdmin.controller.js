// controllers/api.voucherUserAdmin.controller.js
const VoucherUser = require('../models/voucher_user.model');

exports.adminList = async (req, res) => {
  try {
        const raw = await VoucherUser.find()
          .populate('Account_id', 'full_name email phone')
          .populate('voucher_id', 'code discount_percent max_usage_per_user start_date end_date')
          .sort('-createdAt')
          .lean();
      const now = new Date();
      const data = raw.map(vu => {
      const v = vu.voucher_id || {};
      const inRange = v.start_date && v.end_date && now >= new Date(v.start_date) && now <= new Date(v.end_date);
      const limitPerUser = v.max_usage_per_user || 0;
      const isUsed = limitPerUser > 0 && (vu.usage_count || 0) >= limitPerUser;
      return { ...vu, status: inRange ? (isUsed ? 'used' : 'active') : 'expired' };
    });
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
