const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address_id: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
  note: { type: String, default: '' },
  shipping_method: { type: String, required: true },
  payment_method: { type: String, required: true },
  total: { type: Number, required: true },
  original_total: { type: Number, required: true }, // Tổng tiền trước giảm giá
  discount_amount: { type: Number, default: 0 }, // Số tiền giảm giá
  voucher_code: { type: String, default: '' }, // Mã voucher đã sử dụng
  status: { 
    type: String, 
   enum: ['doing', 'shipping', 'done', 'cancelled'],
    default: 'doing',
    required: true 
  },
  created_at: { type: Date, default: Date.now },
  payment_confirmed_at: { type: Date }, // Thời gian xác nhận thanh toán
  delivered_at: { type: Date }, // Thời gian giao hàng thành công
}, { timestamps: true });

// Index để tìm kiếm nhanh hơn
billSchema.index({ user_id: 1, status: 1 });
billSchema.index({ created_at: -1 });

module.exports = mongoose.model('Bill', billSchema);