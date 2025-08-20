// models/voucher_user.model.js (hoặc đúng path bạn đang dùng)
const mongoose = require('./db');
const Schema = mongoose.Schema;

const Voucher_userSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },

  // Trạng thái của QUYỀN DÙNG mã đối với user này:
  // - active: còn quyền dùng (usage_count < max_usage_per_user hoặc max_usage_per_user=0)
  // - used:   đã hết lượt dùng theo giới hạn user
  // - expired: voucher đã hết hạn (theo end_date) => set khi đồng bộ hoặc lúc apply
  status: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },

  // Lần user bấm LƯU vào ví voucher
  saved_at: { type: Date, default: Date.now },

  // Lần dùng GẦN NHẤT
  used_at: { type: Date },

  // Tổng số lần user này đã dùng mã này
  usage_count: { type: Number, default: 0, min: 0 }
}, {
  collection: 'voucher_user',
  timestamps: true
});

// 1 user chỉ có 1 record cho 1 voucher
Voucher_userSchema.index({ Account_id: 1, voucher_id: 1 }, { unique: true });

module.exports = mongoose.model('Voucher_User', Voucher_userSchema);
