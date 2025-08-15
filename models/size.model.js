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
    default: 0,
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

// ✅ Tạo compound index để tránh duplicate size cho cùng 1 product
SizeSchema.index({ product_id: 1, size: 1 }, { unique: true });

// ✅ Index để tối ưu query
SizeSchema.index({ product_id: 1 });

// ✅ Method để update stock của product sau khi size thay đổi
SizeSchema.methods.updateProductStock = async function() {
  try {
    // Chỉ update khi đã được save
    if (!this.product_id) return;
    
    // Sử dụng lazy loading để tránh circular dependency
    const Product = require('./product.model');
    const product = await Product.findById(this.product_id);
    if (product) {
      // Tính tổng stock từ tất cả sizes của product này
      const Size = mongoose.model('Size');
      const sizes = await Size.find({ product_id: this.product_id });
      const totalStock = sizes.reduce((sum, size) => sum + (size.quantity || 0), 0);
      
      // Update stock trực tiếp để tránh infinite loop
      await Product.findByIdAndUpdate(
        this.product_id,
        { stock: totalStock },
        { validateBeforeSave: false }
      );
    }
  } catch (error) {
    console.error('Error updating product stock:', error);
  }
};

// ✅ Pre-save middleware để validation
SizeSchema.pre('save', async function(next) {
  try {
    // Kiểm tra product tồn tại
    const Product = require('./product.model');
    const product = await Product.findById(this.product_id);
    if (!product) {
      throw new Error('Product not found');
    }
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Post-save middleware để update product stock
SizeSchema.post('save', async function(doc) {
  await doc.updateProductStock();
});

// ✅ Post-remove middleware để update product stock khi xóa size
SizeSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await doc.updateProductStock();
  }
});

// ✅ QUAN TRỌNG: Đăng ký model với tên 'Size'
module.exports = mongoose.model('Size', SizeSchema);