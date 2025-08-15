const Base = require('./base.controller');
const Size = require('../models/size.model');
const Product = require('../models/product.model');

// ✅ Export base methods với proper error handling
const baseController = Base(Size);

// ✅ Override Add method với validation và stock update
const Add = async (req, res) => {
  try {
    console.log('🔄 Adding new size:', req.body);
    
    // Validate required fields
    if (!req.body.product_id || !req.body.size) {
      return res.status(400).json({ 
        msg: 'Product ID and size are required', 
        data: null 
      });
    }

    // Kiểm tra product tồn tại
    const product = await Product.findById(req.body.product_id);
    if (!product) {
      return res.status(404).json({ 
        msg: 'Product not found', 
        data: null 
      });
    }

    // Kiểm tra size đã tồn tại cho product này chưa
    const existingSize = await Size.findOne({ 
      product_id: req.body.product_id, 
      size: req.body.size.trim()
    });
    
    if (existingSize) {
      return res.status(400).json({ 
        msg: 'Size already exists for this product', 
        data: null 
      });
    }

    // Tạo size mới
    const sizeData = {
      product_id: req.body.product_id,
      size: req.body.size.trim(),
      quantity: Number(req.body.quantity) || 0,
      price_increase: Number(req.body.price_increase) || 0
    };

    const obj = new Size(sizeData);
    const saved = await obj.save();
    
    console.log('✅ Size created successfully:', saved._id);
    res.json({ msg: 'OK', data: saved });
    
  } catch (err) {
    console.error('❌ Size creation error:', err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ 
        msg: 'Size already exists for this product', 
        data: null 
      });
    }
    
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Edit method với validation và stock update
const Edit = async (req, res) => {
  try {
    console.log('🔄 Updating size:', req.params.id, 'with data:', req.body);
    
    const sizeId = req.params.id;
    
    // Kiểm tra size tồn tại
    const existingSize = await Size.findById(sizeId);
    if (!existingSize) {
      return res.status(404).json({ 
        msg: 'Size not found', 
        data: null 
      });
    }

    // Nếu thay đổi size name, kiểm tra trùng lặp
    if (req.body.size && req.body.size.trim() !== existingSize.size) {
      const duplicateSize = await Size.findOne({ 
        product_id: existingSize.product_id, 
        size: req.body.size.trim(),
        _id: { $ne: sizeId } // Loại trừ chính nó
      });
      
      if (duplicateSize) {
        return res.status(400).json({ 
          msg: 'Size name already exists for this product', 
          data: null 
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (req.body.size !== undefined) updateData.size = req.body.size.trim();
    if (req.body.quantity !== undefined) updateData.quantity = Number(req.body.quantity);
    if (req.body.price_increase !== undefined) updateData.price_increase = Number(req.body.price_increase);

    const updated = await Size.findByIdAndUpdate(
      sizeId,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Size updated successfully:', updated._id);
    res.json({ msg: 'OK', data: updated });
    
  } catch (err) {
    console.error('❌ Size update error:', err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ 
        msg: 'Size name already exists for this product', 
        data: null 
      });
    }
    
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Delete method với stock update
const Delete = async (req, res) => {
  try {
    console.log('🗑️ Deleting size:', req.params.id);
    
    const sizeId = req.params.id;
    
    // Lấy thông tin size trước khi xóa
    const sizeToDelete = await Size.findById(sizeId);
    if (!sizeToDelete) {
      return res.status(404).json({ 
        msg: 'Size not found', 
        data: null 
      });
    }

    const productId = sizeToDelete.product_id;
    
    // Xóa size
    await Size.findByIdAndDelete(sizeId);
    
    // Update product stock sau khi xóa
    const product = await Product.findById(productId);
    if (product) {
      await product.updateStockFromSizes();
    }
    
    console.log('✅ Size deleted successfully:', sizeId);
    res.json({ msg: 'OK' });
    
  } catch (err) {
    console.error('❌ Size deletion error:', err);
    res.status(400).json({ msg: err.message });
  }
};

// ✅ Method để lấy sizes theo product ID
const getSizesByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const sizes = await Size.find({ product_id: productId }).sort({ size: 1 });
    res.json({ msg: 'OK', data: sizes });
    
  } catch (err) {
    console.error('❌ Get sizes by product error:', err);
    res.status(500).json({ msg: err.message });
  }
};

// ✅ Method để bulk create sizes
const bulkCreate = async (req, res) => {
  try {
    const { product_id, sizes } = req.body;
    
    if (!product_id || !sizes || !Array.isArray(sizes)) {
      return res.status(400).json({
        msg: 'Product ID and sizes array are required',
        data: null
      });
    }

    // Kiểm tra product tồn tại
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        msg: 'Product not found',
        data: null
      });
    }

    // Prepare sizes data
    const sizesData = sizes.map(s => ({
      product_id: product_id,
      size: s.size.trim(),
      quantity: Number(s.quantity) || 0,
      price_increase: Number(s.price_increase) || 0
    }));

    // Insert sizes
    const createdSizes = await Size.insertMany(sizesData);
    
    // Update product stock
    await product.updateStockFromSizes();

    console.log('✅ Bulk created sizes:', createdSizes.length);
    res.json({ msg: 'OK', data: createdSizes });
    
  } catch (err) {
    console.error('❌ Bulk create sizes error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Method để bulk update sizes
const bulkUpdate = async (req, res) => {
  try {
    const { sizes } = req.body;
    
    if (!sizes || !Array.isArray(sizes)) {
      return res.status(400).json({
        msg: 'Sizes array is required',
        data: null
      });
    }

    const updatedSizes = [];
    
    for (const sizeData of sizes) {
      if (sizeData._id) {
        const updated = await Size.findByIdAndUpdate(
          sizeData._id,
          {
            size: sizeData.size.trim(),
            quantity: Number(sizeData.quantity) || 0,
            price_increase: Number(sizeData.price_increase) || 0
          },
          { new: true, runValidators: true }
        );
        if (updated) updatedSizes.push(updated);
      }
    }

    console.log('✅ Bulk updated sizes:', updatedSizes.length);
    res.json({ msg: 'OK', data: updatedSizes });
    
  } catch (err) {
    console.error('❌ Bulk update sizes error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Method để xóa tất cả sizes của một product
const deleteByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const result = await Size.deleteMany({ product_id: productId });
    
    // Update product stock
    const product = await Product.findById(productId);
    if (product) {
      await product.updateStockFromSizes();
    }
    
    console.log('✅ Deleted sizes for product:', productId, '- Count:', result.deletedCount);
    res.json({ 
      msg: 'OK', 
      data: { deletedCount: result.deletedCount }
    });
    
  } catch (err) {
    console.error('❌ Delete sizes by product error:', err);
    res.status(500).json({ msg: err.message });
  }
};

// ✅ Export tất cả methods
module.exports = {
  // Base methods
  getList: baseController.getList,
  GetOne: baseController.GetOne,
  
  // Override methods
  Add,
  Edit,
  Delete,
  
  // Custom methods
  getSizesByProduct,
  bulkCreate,
  bulkUpdate,
  deleteByProduct
};