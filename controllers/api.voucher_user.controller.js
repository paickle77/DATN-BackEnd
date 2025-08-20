// controllers/api.voucher_user.controller.js
const Voucher = require('../models/voucher.model');
const VoucherUser = require('../models/voucher_user.model');

function isInDateRange(v) {
  const now = new Date();
  return v.start_date && v.end_date && now >= new Date(v.start_date) && now <= new Date(v.end_date);
}

// GET /voucher_users/my?account_id=...
exports.myList = async (req, res) => {
  try {
    const { account_id } = req.query;
    if (!account_id) return res.status(400).json({ success: false, msg: 'Thiếu account_id' });

    const data = await VoucherUser.find({ Account_id: account_id })
      .populate('voucher_id')
      .lean();

    // đồng bộ trạng thái expired theo end_date
    const now = new Date();
    const mapped = data.map(vu => {
      const v = vu.voucher_id || {};
      const expired = !(v.start_date && v.end_date && now >= new Date(v.start_date) && now <= new Date(v.end_date));
      return {
        ...vu,
        status: expired ? 'expired' : vu.status
      };
    });

    res.json({ success: true, data: mapped });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

// POST /voucher_users/save  body: { account_id, code }
exports.saveVoucher = async (req, res) => {
  try {
    const { account_id, code } = req.body;
    if (!account_id || !code) return res.status(400).json({ success: false, msg: 'Thiếu account_id hoặc code' });

    const voucher = await Voucher.findOne({ code: String(code).trim().toUpperCase() });
    if (!voucher) return res.status(404).json({ success: false, msg: 'Mã không tồn tại' });
    if (voucher.status !== 'active') return res.status(400).json({ success: false, msg: 'Mã đang tạm ngưng' });

    if (!isInDateRange(voucher)) {
      return res.status(400).json({ success: false, msg: 'Mã không còn hiệu lực' });
    }

    let vu = await VoucherUser.findOne({ Account_id: account_id, voucher_id: voucher._id });
    if (!vu) {
      vu = await VoucherUser.create({
        Account_id: account_id,
        voucher_id: voucher._id,
        status: 'active',
        saved_at: new Date(),
        usage_count: 0
      });
    }

    res.json({ success: true, data: vu });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};
