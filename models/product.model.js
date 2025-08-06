const mongoose = require('./db');

const ProductSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  description:    { type: String },
  price:          { type: Number, required: true },
  discount_price: { type: Number, default: 0 },
  image_url:      { type: String },
  // branch_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  is_active:      { type: Boolean, default: true },
  rating:         { type: Number, default: 0 },
  stock:          { type: Number, default: 0 }, // ✅ Thêm field stock
  ingredient_id:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }],
  category_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
}, {
  collection: 'products',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// ✅ Middleware để tự động tính stock từ sizes
ProductSchema.methods.updateStockFromSizes = async function() {
  const Size = mongoose.model('Size');
  const sizes = await Size.find({ product_id: this._id });
  const totalStock = sizes.reduce((sum, size) => sum + size.quantity, 0);
  this.stock = totalStock;
  return this.save();
};

module.exports = mongoose.model('Product', ProductSchema);