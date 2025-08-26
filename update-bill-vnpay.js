// Script cập nhật đơn hàng hiện có để thêm thông tin VNPay cho test hoàn tiền tự động
require('dotenv').config(); // 🔥 THÊM: Load .env file
const mongoose = require('mongoose');
const Bill = require('./models/bill.model');

// 🔥 FIX: Kết nối MongoDB Atlas từ .env (giống như ứng dụng thật)
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cake_shop_db';
console.log('🔗 Connecting to:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide password

mongoose.connect(mongoUri);

async function updateBillForVNPayTest() {
  try {
    console.log('🔧 Cập nhật đơn hàng để test hoàn tiền VNPay tự động...');

    // Sử dụng bill_id từ log của bạn
    const billId = '68ad88b8439aacfab4faa7ed';
    
    const updatedBill = await Bill.findByIdAndUpdate(
      billId,
      {
        // 🔥 THÊM THÔNG TIN VNPAY ĐẦY ĐỦ
        vnpay_transaction_no: 'TEST_VNPAY_' + Date.now(),
        vnpay_transaction_date: '20250826101312', // Format VNPay: yyyyMMddHHmmss
        payment_method: 'vnpay',
        payment_status: 'paid',
        status: 'refund_pending', // Đảm bảo trạng thái đúng
        
        // Reset refund status để test lại
        refund_processed_at: null,
        vnpay_refund_code: '',
        admin_note: 'Đã cập nhật thông tin VNPay để test hoàn tiền tự động'
      },
      { new: true }
    );

    if (updatedBill) {
      console.log('✅ Cập nhật thành công đơn hàng:');
      console.log('📋 Bill ID:', updatedBill._id);
      console.log('💳 VNPay Transaction No:', updatedBill.vnpay_transaction_no);
      console.log('📅 VNPay Transaction Date:', updatedBill.vnpay_transaction_date);
      console.log('🔄 Status:', updatedBill.status);
      console.log('💳 Payment Status:', updatedBill.payment_status);
      console.log('💰 Refund Amount:', updatedBill.refund_amount);
      console.log('');
      console.log('🎯 Bây giờ bạn có thể test hoàn tiền tự động:');
      console.log('1. Refresh RefundManagement trên web admin');
      console.log('2. Tìm đơn hàng có ID:', updatedBill._id);
      console.log('3. Bấm "Duyệt hoàn tiền"');
      console.log('4. Sẽ thấy log: "💳 Processing VNPay refund..." thay vì "⚠️ Missing VNPay transaction..."');
    } else {
      console.log('❌ Không tìm thấy đơn hàng với ID:', billId);
    }

  } catch (error) {
    console.error('❌ Lỗi cập nhật đơn hàng:', error);
  } finally {
    mongoose.disconnect();
  }
}

updateBillForVNPayTest();
