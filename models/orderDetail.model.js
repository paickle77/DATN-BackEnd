const mongoose = require('./db');

const OrderDetailSchema = new mongoose.Schema({
  order_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order',   required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:   { type: Number,                                required: true, min: 1 },
  price:      { type: Number,                                required: true }
}, {
  collection: 'order_details'
});

module.exports = mongoose.model('OrderDetail', OrderDetailSchema);
