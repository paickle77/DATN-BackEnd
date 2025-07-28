// cleanup-sizes.js
require('dotenv').config();
const mongoose = require('./models/db'); // Đường dẫn tới file db.js của bạn
const Product = require('./models/product.model');
const Size = require('./models/size.model');

async function cleanupSizes() {
  try {
    console.log('🔄 Bắt đầu làm sạch dữ liệu sizes...');
    
    // Lấy tất cả product IDs hợp lệ
    const validProducts = await Product.find({}, '_id');
    const validProductIds = validProducts.map(p => p._id);
    
    console.log(`✅ Tìm thấy ${validProductIds.length} products hợp lệ`);
    
    // Tìm sizes có product_id không hợp lệ
    const invalidSizes = await Size.find({
      product_id: { $nin: validProductIds }
    });
    
    console.log(`❌ Tìm thấy ${invalidSizes.length} sizes không hợp lệ`);
    
    if (invalidSizes.length > 0) {
      // In ra danh sách sizes sẽ bị xóa
      console.log('📋 Danh sách sizes sẽ bị xóa:');
      invalidSizes.forEach(size => {
        console.log(`   - ID: ${size._id}, Product ID: ${size.product_id}, Size: ${size.size}`);
      });
      
      // Xóa sizes không hợp lệ
      const result = await Size.deleteMany({
        product_id: { $nin: validProductIds }
      });
      
      console.log(`✅ Đã xóa ${result.deletedCount} sizes không hợp lệ`);
    } else {
      console.log('✅ Không có sizes nào cần xóa');
    }
    
    // Hiển thị thống kê cuối cùng
    const remainingSizes = await Size.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    console.log('📊 Thống kê sau khi làm sạch:');
    console.log(`   - Tổng products: ${totalProducts}`);
    console.log(`   - Tổng sizes: ${remainingSizes}`);
    
    console.log('✅ Hoàn thành làm sạch dữ liệu!');
    
  } catch (error) {
    console.error('❌ Lỗi khi làm sạch dữ liệu:', error);
  } finally {
    // Đóng kết nối database
    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối database');
    process.exit(0);
  }
}

// Chạy script
cleanupSizes();