const Base = require('./base.controller');
const Product = require('../models/product.model');
const Size = require('../models/size.model');

// Lấy base methods từ Base controller
const baseController = Base(Product);

// Tạo product controller với base methods và custom methods
const productController = {
  // Spread tất cả base methods (getList, GetOne, Add, Edit, Delete)
  ...baseController,
  
  // ✅ Override Add method để tự động tính stock
  Add: async (req, res) => {
    try {
      const obj = new Product(req.body);
      const saved = await obj.save();
      
      // Tự động tính stock từ sizes nếu có
      await saved.updateStockFromSizes();
      
      res.json({ msg: 'OK', data: saved });
    } catch (err) {
      res.status(400).json({ msg: err.message, data: null });
    }
  },

  // ✅ Override Edit method để tự động tính stock
  Edit: async (req, res) => {
    try {
      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      // Tự động tính stock từ sizes
      await updated.updateStockFromSizes();
      
      res.json({ msg: 'OK', data: updated });
    } catch (err) {
      res.status(400).json({ msg: err.message, data: null });
    }
  },

  // ✅ Method để cập nhật stock cho một product
  updateStock: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ msg: 'Product not found' });
      }
      
      await product.updateStockFromSizes();
      res.json({ msg: 'Stock updated successfully', data: product });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // ✅ Method để cập nhật stock cho tất cả products
  updateAllStock: async (req, res) => {
    try {
      const products = await Product.find();
      let updatedCount = 0;
      
      for (const product of products) {
        await product.updateStockFromSizes();
        updatedCount++;
      }
      
      res.json({ 
        msg: 'All stocks updated successfully', 
        data: { updatedCount } 
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // Existing methods
  GetListByCategory: async (req, res) => {
    try {
      const list = await Product.find({ category_id: req.params.id });
      res.json({ msg: 'OK', data: list });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  SearchByName: async (req, res) => {
    try {
      const regex = new RegExp(req.query.q, 'i');
      const list = await Product.find({ name: regex });
      res.json({ msg: 'OK', data: list });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  getProductAndCategoryName: async (req, res) => {
    try {
      const products = await Product.find()
        .populate('category_id', 'name')
        .populate('ingredient_id', 'name')
        .exec();
       
      res.json({ msg: 'OK', data: products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // 🔄 FIXED: Đổi tên từ getProductAndIngredientName thành getProductAndSupplierName
  getProductAndSupplierName: async (req, res) => {
    try {
      const products = await Product.find()
        .populate('supplier_id', 'name')
        .exec();
     
      res.json({ msg: 'OK', data: products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getproductbyID: async (req, res) => {
    try {
      const products = await Product.findById(req.params.id)
        .populate('category_id')
        .exec();
     
      res.json({ msg: 'OK', data: products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getProductWithSizes: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('category_id', 'name')
        .populate('ingredient_id', 'name')
        .exec();
      
      if (!product) {
        return res.status(404).json({ msg: 'Product not found', data: null });
      }

      // Lấy sizes của product
      const sizes = await Size.find({ product_id: req.params.id });
      
      res.json({ 
        msg: 'OK', 
        data: {
          ...product.toObject(),
          sizes: sizes
        }
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  getAllProductsWithSizes: async (req, res) => {
    try {
      const products = await Product.find()
        .populate('category_id', 'name')
        .populate('ingredient_id', 'name')
        .exec();
      
      // Lấy sizes cho từng product
      const productsWithSizes = await Promise.all(
        products.map(async (product) => {
          const sizes = await Size.find({ product_id: product._id });
          return {
            ...product.toObject(),
            sizes: sizes
          };
        })
      );

      res.json({ msg: 'OK', data: productsWithSizes });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // 🔄 NEW: Thêm method để lấy products theo supplier
  GetListBySupplier: async (req, res) => {
    try {
      const products = await Product.find({ supplier_id: req.params.id })
        .populate('category_id', 'name')
        .populate('supplier_id', 'name')
        .sort({ name: 1 });
      
      res.json({ msg: 'OK', data: products });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // 🔄 NEW: Thêm method để lấy products hết hàng
  GetOutOfStock: async (req, res) => {
    try {
      const products = await Product.find({ 
        $or: [
          { stock: 0 },
          { stock: { $lt: 5 } } // Sắp hết hàng (dưới 5)
        ]
      })
      .populate('category_id', 'name')
      .populate('supplier_id', 'name')
      .sort({ stock: 1 });
      
      res.json({ msg: 'OK', data: products });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  // 🔄 NEW: Thêm method để lấy products sắp hết hạn
  GetExpiringSoon: async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      const products = await Product.find({
        expiry_date: {
          $gte: new Date(),
          $lte: targetDate
        }
      })
      .populate('category_id', 'name')
      .populate('supplier_id', 'name')
      .sort({ expiry_date: 1 });

      res.json({ msg: 'OK', data: products });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  }
};

module.exports = productController;