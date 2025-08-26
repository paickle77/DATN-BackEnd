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
    min: 0
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  price_increase: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  collection: 'sizes',
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Tạo index để tối ưu query
SizeSchema.index({ product_id: 1, size: 1 });

module.exports = mongoose.model('sizes', SizeSchema); 
