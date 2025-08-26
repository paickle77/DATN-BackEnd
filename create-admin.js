const bcrypt = require('bcrypt');
const Account = require('./models/account.model');
require('dotenv').config();

async function createAdmin() {
  try {
    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await Account.findOne({ email: 'admin@cakeshop.com' });
    if (existingAdmin) {
      console.log('✅ Admin account đã tồn tại:', existingAdmin.email);
      process.exit(0);
    }

    // Tạo admin mới
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new Account({
      email: 'admin@cakeshop.com',
      password: hashedPassword,
      role: 'admin',
      provider: 'local'
    });

    await admin.save();
    console.log('✅ Đã tạo admin account thành công!');
    console.log('📧 Email: admin@cakeshop.com');
    console.log('🔑 Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi tạo admin:', error);
    process.exit(1);
  }
}

createAdmin();
