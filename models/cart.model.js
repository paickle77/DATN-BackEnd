const mongoose = require('./db');
const Schema = mongoose.Schema;

const CartSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:   { type: Number, required: true, min: 1 },
  size_id: { type: Schema.Types.ObjectId, ref: 'sizes', required: true },
}, {
  collection: 'cart'
});

module.exports = mongoose.model('Cart', CartSchema);
