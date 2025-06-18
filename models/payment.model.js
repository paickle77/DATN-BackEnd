const mongoose = require('./db');

const PaymentSchema = new mongoose.Schema({
  method:       { type: String, required: true },
  status:       { type: String, default: 'Pending' },
  payment_time: { type: Date },
  order_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }
}, {
  collection: 'payments'
});

module.exports = mongoose.model('Payment', PaymentSchema);
