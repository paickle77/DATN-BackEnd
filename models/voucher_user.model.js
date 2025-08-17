const mongoose = require('./db');
const Schema = mongoose.Schema;

const Voucher_userSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
  status: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },

  saved_at: { type: Date, default: Date.now },  // lúc user bấm lưu
  used_at: { type: Date }
}, {
  collection: 'voucher_user'
});

// Tạo unique constraint để 1 user chỉ có thể lưu 1 voucher 1 lần
Voucher_userSchema.index({ Account_id: 1, voucher_id: 1 }, { unique: true });

module.exports = mongoose.model('Voucher_User', Voucher_userSchema);
