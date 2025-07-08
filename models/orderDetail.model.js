// models/orderDetail.model.js
const mongoose = require('./db');

const OrderDetailSchema = new mongoose.Schema({
  order_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order',   required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:   { type: Number,                                required: true, min: 1 },
  price:      { type: Number,                                required: true }
}, {
  collection: 'order_details'
});

// Thêm 'order_details' làm tham số thứ ba để ép Mongoose dùng đúng collection này
module.exports = mongoose.model('OrderDetail', OrderDetailSchema, 'order_details');
