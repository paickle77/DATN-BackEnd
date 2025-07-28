const Base = require('./base.controller');
const Size = require('../models/size.model');
const Product = require('../models/product.model');

// Export base methods nhưng override một số method
module.exports = Base(Size);

// ✅ Override Add method
module.exports.Add = async (req, res) => {
  try {
    const obj = new Size(req.body);
    const saved = await obj.save();
    
    // Tự động cập nhật stock của product
    const product = await Product.findById(saved.product_id);
    if (product) {
      await product.updateStockFromSizes();
    }
    
    res.json({ msg: 'OK', data: saved });
  } catch (err) {
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Edit method
module.exports.Edit = async (req, res) => {
  try {
    const updated = await Size.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Tự động cập nhật stock của product
    const product = await Product.findById(updated.product_id);
    if (product) {
      await product.updateStockFromSizes();
    }
    
    res.json({ msg: 'OK', data: updated });
  } catch (err) {
    res.status(400).json({ msg: err.message, data: null });
  }
};

// ✅ Override Delete method
module.exports.Delete = async (req, res) => {
  try {
    const sizeToDelete = await Size.findById(req.params.id);
    const productId = sizeToDelete.product_id;
    
    await Size.findByIdAndDelete(req.params.id);
    
    // Tự động cập nhật stock của product
    const product = await Product.findById(productId);
    if (product) {
      await product.updateStockFromSizes();
    }
    
    res.json({ msg: 'OK' });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};