// models/orderDetail.model.js
const mongoose = require('./db');

const OrderDetailSchema = new mongoose.Schema({
  order_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order',   required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:   { type: Number,                                required: true, min: 1 },
  price:      { type: Number,                                required: true }
}, {
  collection: 'orderdetails'  // sửa lại tên collection cho khớp
});

// Export với tham số thứ ba là 'orderdetails'
module.exports = mongoose.model('OrderDetail', OrderDetailSchema, 'orderdetails');
