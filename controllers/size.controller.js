const Base = require('./base.controller');
const sizes = require('../models/size.model');
const Product = require('../models/product.model');

// Export base methods nhưng override một số method
module.exports = Base(sizes);

// ✅ Override Add method
module.exports.Add = async (req, res) => {
  try {
    const obj = new sizes(req.body);
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
    const updated = await sizes.findByIdAndUpdate(
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
    const sizeToDelete = await sizes.findById(req.params.id);
    const productId = sizeToDelete.product_id;
    
    await sizes.findByIdAndDelete(req.params.id);
    
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
// ✅ Giảm số lượng size theo body
module.exports.DecreaseQuantity = async (req, res) => {
  try {
    const { sizeId, quantityToDecrease } = req.body;

    if (!sizeId || typeof quantityToDecrease !== 'number' || quantityToDecrease <= 0) {
      return res.status(400).json({ msg: 'Dữ liệu không hợp lệ', data: null });
    }

    const size = await sizes.findById(sizeId);
    if (!size) {
      return res.status(404).json({ msg: 'Không tìm thấy size', data: null });
    }

    if (size.quantity < quantityToDecrease) {
      return res.status(400).json({ msg: `Số lượng không đủ. Hiện còn ${size.quantity}`, data: null });
    }

    size.quantity -= quantityToDecrease;
    const updatedSize = await size.save();

    // Tự động cập nhật lại stock của product liên quan
    const product = await Product.findById(size.product_id);
    if (product) {
      await product.updateStockFromSizes();
    }

    return res.json({ msg: 'Đã cập nhật số lượng', data: updatedSize });
  } catch (err) {
    return res.status(500).json({ msg: 'Lỗi server: ' + err.message, data: null });
  }
};
