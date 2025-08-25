const mongoose = require('./db');

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // Mã giảm giá
  description: { type: String }, // Mô tả voucher
  discount_percent: { type: Number, min: 0, max: 100 }, // Giảm % (ưu tiên)
  discount_amount: { type: Number, min: 0 }, // Giảm trực tiếp số tiền (tùy chọn)

  start_date: { type: Date, default: null }, // Ngày bắt đầu (null = áp dụng ngay)
  end_date: { type: Date, default: null },   // Ngày kết thúc (null = vô hạn)

  quantity: { type: Number, default: 0 },    // Tổng số lượng phát hành (0 = vô hạn)
  used_count: { type: Number, default: 0 },  // Số lượt đã dùng

  max_usage_per_user: { type: Number, default: 0 }, // Giới hạn mỗi user dùng (0 = vô hạn)

  min_order_value: { type: Number, default: 0 }, //  Tổng đơn hàng tối thiểu
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  // active = hiển thị, inactive = admin tắt
}, {
  collection: 'vouchers'
});

module.exports = mongoose.model('Voucher', VoucherSchema);
