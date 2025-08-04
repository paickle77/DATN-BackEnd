const mongoose = require('./db');

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  discount_price: { 
    type: Number, 
    default: 0,
    min: 0
  },
  image_url: { 
    type: String,
    trim: true
  },
  branch_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: true 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  stock: { 
    type: Number, 
    default: 0,
    min: 0
  },
  // Thay đổi từ ingredient_id sang supplier_id
  supplier_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier',
    required: true
  },
  category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    required: true
  },
  // Thêm các trường mới cho việc nhập hàng
  import_price: {
    type: Number,
    required: true,
    min: 0
  },
  profit_margin: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // phần trăm
  },
  sku: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // cho phép null nhưng unique nếu có giá trị
  },
  expiry_date: {
    type: Date
  },
  batch_number: {
    type: String,
    trim: true
  }
}, {
  collection: 'products',
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index để tìm kiếm và query nhanh
ProductSchema.index({ name: 1 });
ProductSchema.index({ category_id: 1 });
ProductSchema.index({ supplier_id: 1 });
ProductSchema.index({ is_active: 1 });
ProductSchema.index({ sku: 1 });

// Virtual để tính profit
ProductSchema.virtual('actualProfit').get(function() {
  return this.price - this.import_price;
});

// Virtual để tính profit margin thực tế
ProductSchema.virtual('actualProfitMargin').get(function() {
  if (this.import_price === 0) return 0;
  return ((this.price - this.import_price) / this.import_price) * 100;
});

// Virtual để kiểm tra sản phẩm sắp hết hạn
ProductSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiry_date) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiry_date <= thirtyDaysFromNow;
});

// Method để cập nhật stock từ sizes
ProductSchema.methods.updateStockFromSizes = async function() {
  const Size = mongoose.model('Size');
  const sizes = await Size.find({ product_id: this._id });
  const totalStock = sizes.reduce((sum, size) => sum + size.quantity, 0);
  this.stock = totalStock;
  return this.save();
};

// Method để tính giá bán đề xuất dựa trên profit margin
ProductSchema.methods.calculateSuggestedPrice = function(targetMargin = 30) {
  return Math.ceil(this.import_price * (1 + targetMargin / 100));
};

// Static method để tìm sản phẩm theo supplier
ProductSchema.statics.findBySupplier = function(supplierId) {
  return this.find({ supplier_id: supplierId, is_active: true });
};

// Static method để tìm sản phẩm sắp hết hạn
ProductSchema.statics.findExpiringSoon = function(days = 30) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  return this.find({
    expiry_date: {
      $gte: new Date(),
      $lte: targetDate
    },
    is_active: true
  });
};

// Static method để tìm sản phẩm hết hàng
ProductSchema.statics.findOutOfStock = function() {
  return this.find({ stock: { $lte: 0 }, is_active: true });
};

module.exports = mongoose.model('Product', ProductSchema);