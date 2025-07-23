const mongoose = require('./db');

const Voucher_userSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voucher_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  start_date:       { type: Date,    required: true },
}, {
  collection: 'voucher_user'
});

module.exports = mongoose.model('Voucher_User', Voucher_userSchema);
