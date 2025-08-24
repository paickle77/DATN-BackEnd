const mongoose = require('./db');
const Schema = mongoose.Schema;

const Voucher_userSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  voucher_id: { type: Schema.Types.ObjectId, ref: "Voucher", required: true }, // Tham chiếu voucher gốc
  bill_id: { type: Schema.Types.ObjectId, ref: "Bill", default: null }, // Tham chiếu bill gốc
  code: { type: String, required: true }, // Copy từ voucher gốc

  status: { 
    type: String, 
    enum: ["available", "in_use"], 
    default: "available" 
  }, 
  // available = chưa dùng, có thể sử dụng
  // in_use = đã sử dụng (bao gồm pending và confirmed)

  saved_at: { type: Date, default: Date.now }, // Thời gian user lưu voucher
  used_at: { type: Date }, // Thời gian sử dụng thành công
}, {
  collection: 'voucher_user'
});

// ❌ XÓA unique constraint để cho phép voucher vô hạn lượt
// Voucher_userSchema.index({ Account_id: 1, voucher_id: 1 }, { unique: true });

// ✅ Thay bằng compound index thông thường (không unique)
Voucher_userSchema.index({ Account_id: 1, voucher_id: 1, status: 1 });

module.exports = mongoose.model('Voucher_User', Voucher_userSchema);
