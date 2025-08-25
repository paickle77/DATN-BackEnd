// update-stock.js
require('dotenv').config();
const mongoose = require('./models/db');
const Product = require('./models/product.model');
const Size = require('./models/size.model');

async function updateAllProductsStock() {
  try {
    console.log('🔄 Bắt đầu cập nhật stock cho tất cả products...');
    
    const products = await Product.find();
    console.log(`📊 Tìm thấy ${products.length} products`);
    
    let updatedCount = 0;
    
    for (const product of products) {
      // Tính tổng stock từ sizes
      const sizes = await Size.find({ product_id: product._id });
      const totalStock = sizes.reduce((sum, size) => sum + size.quantity, 0);
      
      // Cập nhật stock
      await Product.findByIdAndUpdate(product._id, { stock: totalStock });
      
      console.log(`✅ Updated ${product.name}: stock = ${totalStock}`);
      updatedCount++;
    }
    
    console.log(`🎉 Hoàn thành! Đã cập nhật stock cho ${updatedCount} products`);
    
    // Hiển thị kết quả
    const updatedProducts = await Product.find({}, 'name stock');
    console.log('\n📋 Kết quả cuối cùng:');
    updatedProducts.forEach(p => {
      console.log(`   ${p.name}: ${p.stock}`);
    });
    
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật stock:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối database');
    process.exit(0);
  }
}

// Chạy script
updateAllProductsStock();