const mongoose = require('./db');

const ProductSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  description:    { type: String },
  price:          { type: Number, required: true },
  discount_price: { type: Number, default: 0 },
  image_url:      { type: String },
  branch_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  is_active:      { type: Boolean, default: true },
  rating:         { type: Number, default: 0 },
  stock:          { type: Number, default: 0 },
  ingredient_id:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }],
  category_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
}, {
  collection: 'products',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.model('Product', ProductSchema);
