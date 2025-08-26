const Base = require('./base.controller');
const sizes = require('../models/size.model');
const Product = require('../models/product.model');

//------------------update Fix web admin---------------------
// Get base methods
const baseController = Base(sizes);
//-----------------Kết thúc Fix web admin---------------------

// ✅ Override Add method với validation và stock update
const Add = async (req, res) => {
  try {
    const obj = new sizes(req.body);
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

//------------------update Fix web admin---------------------
// ✅ Override Edit method
const Edit = async (req, res) => {
//-----------------Kết thúc Fix web admin---------------------  
  try {
    const updated = await sizes.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    const sizeToDelete = await sizes.findById(req.params.id);
    const productId = sizeToDelete.product_id;
    
    await sizes.findByIdAndDelete(req.params.id);
    
    // Update product stock sau khi xóa
    const product = await Product.findById(productId);
    if (product) {
      await product.updateStockFromSizes();
    }
    
    //------------------update Fix web admin---------------------
    console.log('✅ Size deleted successfully:', req.params.id);
    //-----------------Kết thúc Fix web admin---------------------
    res.json({ msg: 'OK' });
    
  } catch (err) {
    console.error('❌ Size deletion error:', err);
    res.status(400).json({ msg: err.message });
  }
};

//------------------update Fix web admin---------------------
// ✅ Cập nhật method giảm số lượng - không cần branch_id
const DecreaseQuantity = async (req, res) => {
//-----------------Kết thúc Fix web admin---------------------
  try {
    const { sizeId, quantityToDecrease } = req.body;

    // Kiểm tra input
    if (!sizeId || !quantityToDecrease) {
      return res.status(400).json({ 
        msg: 'sizeId và quantityToDecrease là bắt buộc', 
        data: null 
      });
    }

    if (typeof quantityToDecrease !== 'number' || quantityToDecrease <= 0) {
      return res.status(400).json({ 
        msg: 'quantityToDecrease phải là số dương', 
        data: null 
      });
    }

    // Tìm size theo ID
    const size = await sizes.findById(sizeId);
    if (!size) {
      return res.status(404).json({ 
        msg: 'Không tìm thấy size', 
        data: null 
      });
    }

    // Kiểm tra số lượng có đủ không
    if (size.quantity < quantityToDecrease) {
      return res.status(400).json({ 
        msg: 'Số lượng không đủ', 
        data: { 
          available: size.quantity, 
          requested: quantityToDecrease 
        } 
      });
    }

    // Giảm số lượng
    size.quantity -= quantityToDecrease;
    const updatedSize = await size.save();

    // Tự động cập nhật stock của product tương ứng
    const product = await Product.findById(size.product_id);
    if (product) {
      await product.updateStockFromSizes();
    }

    res.json({ 
      msg: 'Giảm số lượng thành công', 
      data: { 
        sizeId: updatedSize._id,
        newQuantity: updatedSize.quantity,
        decreased: quantityToDecrease,
        size: updatedSize.size
      } 
    });

  } catch (error) {
    console.error('❌ Lỗi giảm số lượng:', error);
    res.status(500).json({ 
      msg: `Lỗi server: ${error.message}`, 
      data: null 
    });
  }
};
//------------------update Fix web admin---------------------

// ✅ Get sizes by product
const getSizesByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const sizeList = await sizes.find({ product_id: productId }).populate('product_id', 'name');
    res.json({ msg: 'OK', data: sizeList });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

// ✅ Bulk create sizes
const bulkCreate = async (req, res) => {
  try {
    const sizesData = req.body.sizes || [];
    const created = await sizes.insertMany(sizesData);
    res.json({ msg: 'Bulk create successful', data: created });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

// ✅ Bulk update sizes
const bulkUpdate = async (req, res) => {
  try {
    const updates = req.body.updates || [];
    const results = [];
    
    for (const update of updates) {
      const updated = await sizes.findByIdAndUpdate(update.id, update.data, { new: true });
      results.push(updated);
    }
    
    res.json({ msg: 'Bulk update successful', data: results });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

// ✅ Delete all sizes of a product
const deleteByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const result = await sizes.deleteMany({ product_id: productId });
    res.json({ msg: 'Sizes deleted successfully', data: result });
  } catch (error) {
    res.status(500).json({ msg: error.message, data: null });
  }
};

// Export all methods
module.exports = {
  // Base methods
  getList: baseController.getList,
  GetOne: baseController.GetOne,
  
  // Override methods
  Add,
  Edit,
  Delete,
  
  // Additional methods
  DecreaseQuantity,
  getSizesByProduct,
  bulkCreate,
  bulkUpdate,
  deleteByProduct
};
//-----------------Kết thúc Fix web admin---------------------