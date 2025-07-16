// models/refundRequest.model.js
const mongoose = require('./db');
const refundRequestSchema = new mongoose.Schema({
  order_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },  // <-- bắt buộc
  reason:      { type: String, required: true },
  refund_amount:{ type: Number, required: true },
  status:      { type: String, enum: ['Đang xử lý','Đã chấp nhận','Đã từ chối'], default: 'Đang xử lý' },
  processed_by:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processed_at: Date
}, {
  collection: 'refund_requests',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});
module.exports = mongoose.model('RefundRequest', refundRequestSchema);
