const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  address_id: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
  shipper_id: { type: Schema.Types.ObjectId, ref: 'Shipper', default: null },
  note: { type: String, default: '' },
  shipping_method: { type: String, required: true },
  payment_method: { type: String, required: true },
  total: { type: Number, required: true },
  original_total: { type: Number, required: true }, // Tổng tiền trước giảm giá
  discount_amount: { type: Number, default: 0 }, // Số tiền giảm giá
  voucher_code: { type: String, default: '' }, // Mã voucher đã sử dụng
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'ready', 'shipping', 'done', 'cancelled', 'failed'],
    default: 'pending',
    required: true
  },
  shipping_fee: { type: Number, default: 0 },
  address_snapshot: {
    name: String,
    phone: String,
    detail: String,
    ward: String,
    district: String,
    city: String
  },
  created_at: { type: Date, default: Date.now },
  payment_confirmed_at: { type: Date }, // Thời gian xác nhận thanh toán
  delivered_at: { type: Date }, // Thời gian giao hàng thành công
  proof_images: { type: String, default: '' }, // Hình ảnh chứng minh giao hàng (nếu có)
}, { timestamps: true });

// Index để tìm kiếm nhanh hơn
billSchema.index({ user_id: 1, status: 1 });
billSchema.index({ created_at: -1 });

module.exports = mongoose.model('Bill', billSchema);