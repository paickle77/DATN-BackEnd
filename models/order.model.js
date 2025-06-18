const mongoose = require('./db');

const OrderSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  status:      { type: String,                             default: 'pending' },
  address_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Address'       },
  voucher_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher'       }
}, {
  collection: 'orders',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.model('Order', OrderSchema);
