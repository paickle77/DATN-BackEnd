const mongoose = require('./db');

const SizeSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:   { type: Number, required: true, min: 1 },
  size: { type: Number, required: true, min: 1 },
  price_increase: { type: Number}
}, {
  collection: 'size'
});

module.exports = mongoose.model('size', SizeSchema);
