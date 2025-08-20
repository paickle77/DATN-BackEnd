// controllers/api.voucher.controller.js
const Voucher = require('../models/voucher.model');
const VoucherUser = require('../models/voucher_user.model');
const Account = require('../models/account.model');

// Helper: kiểm tra còn hiệu lực theo ngày
function isInDateRange(v) {
  const now = new Date();
  return v.start_date && v.end_date && now >= new Date(v.start_date) && now <= new Date(v.end_date);
}

// ========== CRUD cơ bản (giữ nguyên style của bạn) ==========
exports.list = async (req, res) => {
  try {
      const items = await Voucher.find().sort('-createdAt').lean();
      const ids = items.map(i => i._id);
      const claimedAgg = await VoucherUser.aggregate([
        { $match: { voucher_id: { $in: ids } } },
        { $group: { _id: '$voucher_id', count: { $sum: 1 } } }
      ]);
      const claimedMap = Object.fromEntries(claimedAgg.map(x => [String(x._id), x.count]));
      const data = items.map(v => ({ ...v, claimed_count: claimedMap[String(v._id)] || 0 }));
      res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = req.body;
    payload.code = String(payload.code || '').trim().toUpperCase();

    const exists = await Voucher.findOne({ code: payload.code });
    if (exists) return res.status(400).json({ success: false, msg: 'Mã đã tồn tại' });

    const doc = await Voucher.create(payload);
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    if (payload.code) payload.code = String(payload.code).trim().toUpperCase();

    const doc = await Voucher.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return res.status(404).json({ success: false, msg: 'Không tìm thấy voucher' });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    await Voucher.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

// ========== APPLY voucher (ghi nhận lượt dùng) ==========
// Body: { account_id, code }
exports.apply = async (req, res) => {
  try {
    const { account_id, code } = req.body;
    if (!account_id || !code) {
      return res.status(400).json({ success: false, msg: 'Thiếu account_id hoặc code' });
    }

    const voucher = await Voucher.findOne({ code: String(code).trim().toUpperCase() });
    if (!voucher) return res.status(404).json({ success: false, msg: 'Mã không tồn tại' });

    // Kiểm tra bật/tắt
    if (voucher.status !== 'active') {
      return res.status(400).json({ success: false, msg: 'Mã đang tạm ngưng' });
    }

    // Kiểm tra thời gian
    if (!isInDateRange(voucher)) {
      return res.status(400).json({ success: false, msg: 'Mã không còn hiệu lực' });
    }

    // Kiểm tra số lượng tổng (quantity) – 0 là không giới hạn
    if (voucher.quantity > 0 && voucher.used_count >= voucher.quantity) {
      return res.status(400).json({ success: false, msg: 'Mã đã hết lượt dùng' });
    }

    // Tìm (hoặc tạo) record trong voucher_user cho user này
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

    // Nếu voucher đã hết hạn tại thời điểm này, set expired
    if (!isInDateRange(voucher)) {
      if (vu.status !== 'expired') {
        vu.status = 'expired';
        await vu.save();
      }
      return res.status(400).json({ success: false, msg: 'Mã đã hết hạn' });
    }

    // Kiểm tra hạn mức theo user
    const perUserLimit = voucher.max_usage_per_user || 0; // 0 = không giới hạn
    if (perUserLimit > 0 && vu.usage_count >= perUserLimit) {
      if (vu.status !== 'used') {
        vu.status = 'used';
        await vu.save();
      }
      return res.status(400).json({ success: false, msg: 'Bạn đã dùng hết lượt cho mã này' });
    }

    // Hợp lệ => ghi nhận 1 lượt dùng
    vu.usage_count += 1;
    vu.used_at = new Date();
    if (perUserLimit > 0 && vu.usage_count >= perUserLimit) vu.status = 'used';
    else vu.status = 'active';
    await vu.save();

    // Tăng bộ đếm tổng
    voucher.used_count += 1;
    await voucher.save();

    return res.json({
      success: true,
      msg: 'Áp dụng voucher thành công',
      data: {
        voucher_id: voucher._id,
        code: voucher.code,
        discount_percent: voucher.discount_percent,
        usage_count: vu.usage_count,
        max_usage_per_user: voucher.max_usage_per_user
      }
    });
  } catch (e) {
    console.error('apply voucher error:', e);
    res.status(500).json({ success: false, msg: e.message });
  }
};
