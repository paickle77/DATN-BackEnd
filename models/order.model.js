const mongoose = require('./db');

const OrderSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
   status: {
     type: String,
     enum: [
       'Chờ xác nhận',   // khi user vừa đặt
       'Chờ giao hàng',  // sau admin xác nhận
       'Đang giao',      // sau shipper nhận lệnh
       'Hoàn thành',     // sau shipper đánh dấu xong
       'Đã nhận hàng',   // sau khách confirm đã nhận
       'Đã hủy',         // khi khách hủy trước hoặc trong refund
       'Đã đổi hàng'     // khi đơn bị thay thế
     ],
     default: 'Chờ xác nhận'
   },
  address_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Address'       },
  voucher_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher'       },
  replacement_of: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  cancel_note:    { type: String, default: '' },
  
  payment_method:  { type: String, default: '' },
  shipping_method: { type: String, default: '' },
  note:            { type: String, default: '' },
}, {
  collection: 'orders',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.model('Order', OrderSchema);
