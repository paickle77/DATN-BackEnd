const mongoose = require('./db');
const Schema = mongoose.Schema;

const Voucher_userSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  start_date: { type: Date, required: true },
}, {
  collection: 'voucher_user'
});

module.exports = mongoose.model('Voucher_User', Voucher_userSchema);
