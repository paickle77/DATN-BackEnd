// size.model.js - Sửa lại
const mongoose = require('./db');

const SizeSchema = new mongoose.Schema({
  product_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  size: { 
    type: String, 
    required: true 
  },
  price_increase: { 
    type: Number, 
    default: 0 
  }
}, {
  collection: 'sizes'
});

// Tạo index để tối ưu query
SizeSchema.index({ product_id: 1, size: 1 });

module.exports = mongoose.model('Size', SizeSchema); // Sửa thành 'Size'
