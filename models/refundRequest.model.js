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
  // --- Thêm refund_amount để lưu số tiền cần hoàn ---
  refund_amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Đang xử lý', 'Đã chấp nhận', 'Đã từ chối'],
    default: 'Đang xử lý'
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
}, {
  collection: 'refund_requests'
});

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
