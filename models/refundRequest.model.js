// models/refundRequest.model.js
const mongoose = require('mongoose');
const RefundRequestSchema = new mongoose.Schema({
  bill_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason:        String,
  refund_amount: Number,
  status: {
    type: String,
    enum: ['pending','accepted','rejected'],
    default: 'pending'
  },
  processed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processed_at: Date
},{
  timestamps: { createdAt: 'created_at' }
});
module.exports = mongoose.model('RefundRequest', RefundRequestSchema);
