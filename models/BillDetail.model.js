const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billDetailSchema = new Schema({
  bill_id: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  
}, { timestamps: true });

module.exports = mongoose.model('BillDetail', billDetailSchema);
