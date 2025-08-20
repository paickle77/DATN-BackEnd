// models/voucher.model.js (hoặc đúng path bạn đang dùng)
const mongoose = require('./db');

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  description: { type: String, default: '' },

  // % giảm giá hoặc bạn có thể mở rộng thêm kiểu tiền mặt sau này
  discount_percent: { type: Number, min: 0, max: 100, default: 0 },

  // Khoảng thời gian hiệu lực của voucher
  start_date: { type: Date, required: true },
  end_date:   { type: Date, required: true },

  // Tổng số lượt dùng trên toàn hệ thống (0 = không giới hạn)
  quantity:   { type: Number, default: 0, min: 0 },

  // Đã dùng bao nhiêu lượt (tăng khi user apply thành công)
  used_count: { type: Number, default: 0, min: 0 },

  // Số lần TỐI ĐA mà MỖI USER được dùng mã này (0 = không giới hạn)
  max_usage_per_user: { type: Number, default: 1, min: 0 },

  // Bật/tắt mã (tắt: không cho apply)
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  collection: 'vouchers',
  timestamps: true
});

// Index hữu ích
VoucherSchema.index({ code: 1 });
VoucherSchema.index({ status: 1, start_date: 1, end_date: 1 });

module.exports = mongoose.model('Voucher', VoucherSchema);
