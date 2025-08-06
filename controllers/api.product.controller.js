const Base = require('./base.controller');
const Product = require('../models/product.model');
const Size = require('../models/size.model');

// Export base methods
module.exports = Base(Product);

// ✅ Override Add method để tự động tính stock
module.exports.Add = async (req, res) => {
  try {
    const obj = new Product(req.body);
    const saved = await obj.save();
    
    // Tự động tính stock từ sizes nếu có
    await saved.updateStockFromSizes();
    
    res.json({ msg: 'OK', data: saved });
  } catch (err) {
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Edit method để tự động tính stock
module.exports.Edit = async (req, res) => {
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
};

// ✅ Method để cập nhật stock cho một product
module.exports.updateStock = async (req, res) => {
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
module.exports.updateAllStock = async (req, res) => {
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

// Các method khác giữ nguyên
module.exports.GetListByCategory = async (req, res) => {
  try {
    const list = await Product.find({ category_id: req.params.id });
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports.SearchByName = async (req, res) => {
  try {
    const regex = new RegExp(req.query.q, 'i');
    const list = await Product.find({ name: regex });
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports.getProductAndCategoryName = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category_id', 'name')
      .populate('ingredient_id', 'name')
      .exec();
     
    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getProductAndIngredientName = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('ingredient_id', 'name')
      .exec();
   
    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getproductbyID = async (req, res) => {
  try {
    const products = await Product.findById(req.params.id)
      .populate('category_id')
      .exec();
   
    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getProductWithSizes = async (req, res) => {
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
};

module.exports.getAllProductsWithSizes = async (req, res) => {
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
};