const Base = require('./base.controller');
const Product = require('../models/product.model');
const Size = require('../models/size.model');

// ✅ Export base methods với proper error handling
const baseController = Base(Product);

// ✅ Override Add method để tự động tính stock và validation
const Add = async (req, res) => {
  try {
    console.log('📝 Creating new product with data:', req.body);
    
    // Basic validation
    if (!req.body.name || !req.body.category_id) {
      return res.status(400).json({ 
        msg: 'Name and category are required', 
        data: null 
      });
    }

    // Prepare product data
    const productData = {
      name: req.body.name.trim(),
      description: req.body.description || '',
      price: Number(req.body.price) || 0,
      discount_price: Number(req.body.discount_price) || 0,
      image_url: req.body.image_url || '',
      category_id: req.body.category_id,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true,
      rating: Number(req.body.rating) || 0,
      stock: Number(req.body.stock) || 0,
      
      // ✅ Web admin specific fields (optional)
      supplier_id: req.body.supplier_id || undefined,
      import_price: Number(req.body.import_price) || 0,
      profit_margin: Number(req.body.profit_margin) || 30,
      sku: req.body.sku ? req.body.sku.trim() : undefined,
      batch_number: req.body.batch_number ? req.body.batch_number.trim() : undefined,
      expiry_date: req.body.expiry_date ? new Date(req.body.expiry_date) : undefined,
      
      // ✅ Mobile app compatibility fields
      ingredient_id: req.body.ingredient_id || req.body.ingredient_ids || []
    };

    const obj = new Product(productData);
    const saved = await obj.save();
    
    // Tự động tính stock từ sizes nếu có
    await saved.updateStockFromSizes();
    
    console.log('✅ Product created successfully:', saved._id);
    res.json({ msg: 'OK', data: saved });
    
  } catch (err) {
    console.error('❌ Product creation error:', err);
    
    // Handle duplicate SKU error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.sku) {
      return res.status(400).json({ 
        msg: 'SKU already exists', 
        data: null 
      });
    }
    
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Edit method để tự động tính stock và validation  
const Edit = async (req, res) => {
  try {
    console.log('📝 Updating product:', req.params.id, 'with data:', req.body);
    
    // Kiểm tra product tồn tại
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ 
        msg: 'Product not found', 
        data: null 
      });
    }

    // Prepare update data - chỉ update các field được gửi
    const updateData = {};
    
    // Basic fields
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.discount_price !== undefined) updateData.discount_price = Number(req.body.discount_price);
    if (req.body.image_url !== undefined) updateData.image_url = req.body.image_url;
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
    if (req.body.rating !== undefined) updateData.rating = Number(req.body.rating);
    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);
    
    // Web admin specific fields
    if (req.body.supplier_id !== undefined) updateData.supplier_id = req.body.supplier_id;
    if (req.body.import_price !== undefined) updateData.import_price = Number(req.body.import_price);
    if (req.body.profit_margin !== undefined) updateData.profit_margin = Number(req.body.profit_margin);
    if (req.body.sku !== undefined) updateData.sku = req.body.sku ? req.body.sku.trim() : undefined;
    if (req.body.batch_number !== undefined) updateData.batch_number = req.body.batch_number ? req.body.batch_number.trim() : undefined;
    if (req.body.expiry_date !== undefined) updateData.expiry_date = req.body.expiry_date ? new Date(req.body.expiry_date) : undefined;
    
    // Mobile compatibility
    if (req.body.ingredient_id !== undefined) updateData.ingredient_id = req.body.ingredient_id;
    if (req.body.ingredient_ids !== undefined) updateData.ingredient_id = req.body.ingredient_ids;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Tự động tính stock từ sizes
    await updated.updateStockFromSizes();
    
    console.log('✅ Product updated successfully:', updated._id);
    res.json({ msg: 'OK', data: updated });
    
  } catch (err) {
    console.error('❌ Product update error:', err);
    
    // Handle duplicate SKU error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.sku) {
      return res.status(400).json({ 
        msg: 'SKU already exists', 
        data: null 
      });
    }
    
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Delete method với proper cleanup
const Delete = async (req, res) => {
  try {
    console.log('🗑️ Deleting product:', req.params.id);
    
    // Kiểm tra product tồn tại
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        msg: 'Product not found', 
        data: null 
      });
    }

    // Xóa tất cả sizes liên quan
    await Size.deleteMany({ product_id: req.params.id });
    console.log('✅ Related sizes deleted');
    
    // Xóa product
    await Product.findByIdAndDelete(req.params.id);
    
    console.log('✅ Product deleted successfully:', req.params.id);
    res.json({ msg: 'OK' });
    
  } catch (err) {
    console.error('❌ Product deletion error:', err);
    res.status(400).json({ msg: err.message });
  }
};

// ✅ Method để cập nhật stock cho một product
const updateStock = async (req, res) => {
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
};

// ✅ Method để cập nhật stock cho tất cả products
const updateAllStock = async (req, res) => {
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
};

// ✅ Method để lấy product với sizes (cho web admin)
const getProductWithSizes = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category_id', 'name')
      .populate('supplier_id', 'name contact_person')
      .exec();
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found', data: null });
    }

    // Lấy sizes của product
    const sizes = await Size.find({ product_id: req.params.id }).sort({ size: 1 });
    
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
};

// ✅ Method để lấy tất cả products với sizes (cho web admin)
const getAllProductsWithSizes = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category_id', 'name')
      .populate('supplier_id', 'name contact_person')
      .sort({ created_at: -1 })
      .exec();
    
    // Lấy sizes cho từng product
    const productsWithSizes = await Promise.all(
      products.map(async (product) => {
        const sizes = await Size.find({ product_id: product._id }).sort({ size: 1 });
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
};

// ✅ NEW METHOD: getProductsWithSizes - Tương thích với frontend
const getProductsWithSizes = async (req, res) => {
  try {
    console.log('📊 Getting all products with sizes for web admin...');
    
    const products = await Product.find()
      .populate('category_id', 'name')
      .populate('supplier_id', 'name contact_person')
      .sort({ created_at: -1 })
      .exec();
    
    // Lấy sizes cho từng product
    const productsWithSizes = await Promise.all(
      products.map(async (product) => {
        const sizes = await Size.find({ product_id: product._id }).sort({ size: 1 });
        return {
          ...product.toObject(),
          sizes: sizes
        };
      })
    );

    console.log('✅ Products with sizes loaded:', productsWithSizes.length);
    res.json({ msg: 'OK', data: productsWithSizes });
  } catch (err) {
    console.error('❌ Get products with sizes error:', err);
    res.status(500).json({ msg: err.message });
  }
};

// ✅ MOBILE APP COMPATIBILITY METHODS - Giữ nguyên không đổi
const GetListByCategory = async (req, res) => {
  try {
    const list = await Product.find({ 
      category_id: req.params.id, 
      is_active: true 
    }).populate('category_id', 'name');
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const SearchByName = async (req, res) => {
  try {
    const regex = new RegExp(req.query.q, 'i');
    const list = await Product.find({ 
      $or: [
        { name: regex },
        { description: regex }
      ],
      is_active: true 
    });
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getProductAndCategoryName = async (req, res) => {
  try {
    const products = await Product.find({ is_active: true })
      .populate('category_id', 'name')
      .populate('ingredient_id', 'name')
      .exec();
     
    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProductAndIngredientName = async (req, res) => {
  try {
    const products = await Product.find({ is_active: true })
      .populate('ingredient_id', 'name')
      .exec();
   
    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getproductbyID = async (req, res) => {
  try {
    const products = await Product.findById(req.params.id)
      .populate('category_id')
      .populate('supplier_id', 'name contact_person')
      .exec();
   
    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Export tất cả methods
module.exports = {
  // Base methods (mobile compatible)
  getList: baseController.getList,
  GetOne: baseController.GetOne,
  
  // Override methods
  Add,
  Edit,
  Delete,
  
  // Stock management (web admin)
  updateStock,
  updateAllStock,
  
  // Web admin methods
  getProductWithSizes,
  getAllProductsWithSizes,
  getProductsWithSizes, // ✅ Thêm method mới này
  
  // Mobile app compatibility methods (unchanged)
  GetListByCategory,
  SearchByName,
  getProductAndCategoryName,
  getProductAndIngredientName,
  getproductbyID
};