const mongoose = require('./db');

const CartSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:   { type: Number, required: true, min: 1 },
  size_id: { type: mongoose.Schema.Types.ObjectId, ref: 'size', required: true },
}, {
  collection: 'cart'
});

module.exports = mongoose.model('Cart', CartSchema);
