const mongoose = require('./db');

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 255
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
  

  category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    required: true
  },
  
  // ✅ Thêm các field mới cho web admin (không ảnh hưởng mobile)
  supplier_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier' 
  },
  import_price: { 
    type: Number, 
    default: 0,
    min: 0
  },
  profit_margin: { 
    type: Number, 
    default: 30,
    min: 0,
    max: 100
  },
  sku: { 
    type: String,
    trim: true,
    sparse: true, // Cho phép null/undefined nhưng unique khi có giá trị
    index: true
  },
  batch_number: { 
    type: String,
    trim: true
  },
  expiry_date: { 
    type: Date 
  }
}, {
  collection: 'products',
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// ✅ Indexes để tối ưu performance
ProductSchema.index({ name: 'text', description: 'text' }); // Text search
ProductSchema.index({ category_id: 1 });
ProductSchema.index({ supplier_id: 1 });
ProductSchema.index({ sku: 1 }, { sparse: true });
ProductSchema.index({ is_active: 1 });

// ✅ Virtual để tính profit
ProductSchema.virtual('calculated_profit').get(function() {
  if (this.import_price && this.price > this.import_price) {
    return this.price - this.import_price;
  }
  return 0;
});

// ✅ Virtual để tính profit margin thực tế
ProductSchema.virtual('actual_profit_margin').get(function() {
  if (this.import_price > 0) {
    return ((this.price - this.import_price) / this.import_price) * 100;
  }
  return 0;
});

// ✅ Method để update stock từ sizes - Sửa để tránh circular dependency
ProductSchema.methods.updateStockFromSizes = async function() {
  try {
    // Sử dụng require để tránh circular import
    const Size = require('./size.model');
    const sizes = await Size.find({ product_id: this._id });
    const totalStock = sizes.reduce((sum, size) => sum + (size.quantity || 0), 0);
    
    // Chỉ update stock nếu có thay đổi
    if (this.stock !== totalStock) {
      // Update trực tiếp để tránh infinite loop
      await mongoose.model('Product').findByIdAndUpdate(
        this._id,
        { stock: totalStock },
        { validateBeforeSave: false }
      );
      this.stock = totalStock; // Update local object
    }
    
    return this;
  } catch (error) {
    console.error('Error updating stock from sizes:', error);
    return this;
  }
};

// ✅ Method để kiểm tra sản phẩm sắp hết hạn
ProductSchema.methods.isExpiringSoon = function(days = 30) {
  if (!this.expiry_date) return false;
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + days);
  return this.expiry_date <= warningDate;
};

// ✅ Method để lấy thông tin tóm tắt cho mobile app
ProductSchema.methods.getMobileFormat = function() {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    price: this.price,
    discount_price: this.discount_price,
    image_url: this.image_url,
    is_active: this.is_active,
    rating: this.rating,
    stock: this.stock,
    ingredient_id: this.ingredient_id,
    category_id: this.category_id,
    created_at: this.created_at
  };
};

// ✅ Static method để tìm sản phẩm theo danh mục (cho mobile app)
ProductSchema.statics.findByCategory = function(categoryId) {
  return this.find({ 
    category_id: categoryId, 
    is_active: true 
  }).populate('category_id', 'name');
};

// ✅ Static method để search sản phẩm (cho mobile app)
ProductSchema.statics.searchByName = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({ 
    $or: [
      { name: regex },
      { description: regex }
    ],
    is_active: true 
  });
};

//------------------update Fix Product validation - sửa lỗi ngày hết hạn---------------------
// ✅ Pre-save middleware để validation
ProductSchema.pre('save', function(next) {
  // Validate discount price không được lớn hơn price
  if (this.discount_price > this.price) {
    return next(new Error('Discount price cannot be greater than regular price'));
  }
  
  // 🔥 FIX: Validate expiry date không được trong quá khứ (so sánh chỉ ngày, không so sánh giờ)
  if (this.isNew && this.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset giờ về 00:00:00
    
    const expiryDate = new Date(this.expiry_date);
    expiryDate.setHours(0, 0, 0, 0); // Reset giờ về 00:00:00
    
    if (expiryDate < today) {
      return next(new Error('Expiry date cannot be in the past'));
    }
  }
  
  next();
});
//-----------------Kết thúc Fix Product validation - sửa lỗi ngày hết hạn---------------------

module.exports = mongoose.model('Product', ProductSchema);