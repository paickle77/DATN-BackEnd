const mongoose = require('./db');

const refundRequestSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  customer_name: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  processed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processed_at: Date
});

module.exports = mongoose.model('RefundRequest', refundRequestSchema, 'refund_requests');
