const mongoose = require('./db');

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String },
  discount_percent: { type: Number, default: 0 },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },

  quantity: { type: Number, default: 0 },     // tổng số lượng phát hành
  used_count: { type: Number, default: 0 },     // đã dùng bao nhiêu
  max_usage_per_user: { type: Number, default: 1 },    // tối đa mỗi user được dùng
  status: { type: String, enum: ['active', 'inactive'], default: 'active' } //có thể tắt mã này đi
}, {
  collection: 'vouchers'
});

module.exports = mongoose.model('Voucher', VoucherSchema);
