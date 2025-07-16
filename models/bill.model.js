const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address_id: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
  note: { type: String, default: '' },
  shipping_method: { type: String, enum: ['standard', 'express', 'same_day'], required: true },
  payment_method: { type: String, required: true },
  total: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  status: {type:String, required:true}
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
