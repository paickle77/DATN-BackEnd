const mongoose = require('./db');

const VoucherSchema = new mongoose.Schema({
  code:             { type: String,  required: true, unique: true },
  description:      { type: String },
  discount_percent: { type: Number,  default: 0 },
  start_date:       { type: Date,    required: true },
  end_date:         { type: Date,    required: true }
}, {
  collection: 'vouchers'
});

module.exports = mongoose.model('Voucher', VoucherSchema);
