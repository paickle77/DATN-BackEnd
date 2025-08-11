const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billDetailSchema = new Schema({
  bill_id: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  
  // Thông tin tại thời điểm đặt hàng
  size: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true }, // Giá 1 đơn vị (đã bao gồm size + discount)
  total: { type: Number, required: true }, // quantity * unit_price
  
  // ✅ PRODUCT SNAPSHOT ĐẦY ĐỦ
  product_snapshot: {
    name: { type: String, required: true },
    base_price: Number, // Giá gốc của product
    discount_price: Number, // Giá sau discount (nếu có)
    image_url: String,
   
   
    
    // ✅ SIZE INFORMATION
    selected_size: String, // Size đã chọn
    size_price_increase: Number, // Phí tăng theo size
    final_unit_price: Number, // Giá cuối cùng = (discount_price || base_price) + size_price_increase
  },
}, { timestamps: true });

module.exports = mongoose.model('BillDetail', billDetailSchema);
