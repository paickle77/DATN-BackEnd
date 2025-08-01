const Account = require('../models/account.model');
const Shipper = require('../models/shipper.model');
const bcrypt = require('bcrypt');

// 🔐 Tạo tài khoản shipper – chỉ admin dùng
exports.createShipper = async (req, res) => {
  try {
    const { email, password, full_name, phone, vehicle_type, license_number } = req.body;

    // Kiểm tra input
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
    }

    const existing = await Account.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email đã tồn tại' });

    // Băm mật khẩu
    const hash = await bcrypt.hash(password, 10);

    // Tạo tài khoản (role: shipper)
    const account = new Account({
      email,
      password: hash,
      role: 'shipper'
    });
    await account.save();

    // Tạo profile shipper
    const shipper = new Shipper({
      account_id: account._id,
      full_name,
      phone,
      vehicle_type,
      license_number
    });
    await shipper.save();

    res.json({ success: true, message: 'Tạo shipper thành công', data: { account, shipper } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};