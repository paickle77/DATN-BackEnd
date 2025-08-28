const Account = require('../models/account.model');
const Shipper = require('../models/shipper.model');
const Base = require('./base.controller');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ✅ Kế thừa 5 hàm CRUD mặc định
module.exports = Base(Shipper);



// 🔐 Tạo tài khoản shipper – chỉ admin dùng
module.exports.createShipper = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      phone,
      image,
      vehicle_type,
      license_number,
    } = req.body;

    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
    }

    const existing = await Account.findOne({ email });
    if (existing)
      return res.status(400).json({ error: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 10);

    const account = new Account({
      email,
      password: hash,
      role: 'shipper',
    });
    await account.save();

    const shipper = new Shipper({
      account_id: account._id,
      full_name,
      phone,
      image,
      vehicle_type,
      license_number,
    });
    await shipper.save();

    res.json({
      success: true,
      message: 'Tạo shipper thành công',
      data: { account, shipper },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lấy danh sách shipper (gồm cả tài khoản liên kết)
module.exports.getShippers = async (req, res) => {
  try {
    const shippers = await Shipper.find().populate(
      'account_id',
      'email role'
    );
    res.json({ success: true, data: shippers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Sửa thông tin shipper, có thể kèm ảnh
module.exports.Edit = async (req, res) => {
  try {
    const updateFields = {
      full_name: req.body.full_name,
      phone: req.body.phone,
      vehicle_type: req.body.vehicle_type,
      license_number: req.body.license_number,
    };

    // Nếu client gửi base64
    if (req.body.image) {
      updateFields.image = req.body.image; // Lưu nguyên chuỗi base64
    }

    console.log('📨 req.body:', req.body);

    const updated = await Shipper.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: 'Không tìm thấy shipper' });
    }

    res.json({ msg: 'Cập nhật thành công', data: updated });
  } catch (err) {
    console.error('❌ Lỗi cập nhật shipper:', err);
    res.status(400).json({ msg: err.message });
  }
};


module.exports.EditByAccountId = async (req, res) => {
  try {
    const { account_id } = req.params;

    const shipper = await Shipper.findOne({ account_id });

    if (!shipper) {
return res.status(404).json({ message: 'Shipper not found' });
    }

    // Cập nhật các trường nếu có
    if (req.body.full_name) shipper.full_name = req.body.full_name;
    if (req.body.phone) shipper.phone = req.body.phone;
    if (req.body.license_number) shipper.license_number = req.body.license_number;
    if (req.body.vehicle_type) shipper.vehicle_type = req.body.vehicle_type;

    // Xử lý ảnh nếu có
    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (shipper.image) {
        const oldPath = path.join(__dirname, '..', 'uploads', shipper.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      shipper.image = req.file.filename;
    }

    await shipper.save();

    res.status(200).json({ message: 'Shipper updated successfully', shipper });
  } catch (error) {
    console.error('EditByAccountId error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

module.exports.getShipperByAccountId = async (req, res) => {
  try {
    const { account_id } = req.params;
    

    if (!account_id) {
      return res.status(400).json({ message: 'Thiếu account_id'  });
    }

    const shipper = await Shipper.findOne({ account_id: account_id });
    console.log('🚚 Lấy shipper theo account_id:', account_id);
    console.log('🚚 Kết quả:', shipper);

    if (!shipper) {
      return res.status(404).json({ message: 'Không tìm thấy shipper' });
    }

    res.status(200).json({ success: true, data: shipper });
  } catch (err) {
    console.error('❌ Lỗi khi lấy shipper theo account_id:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports.updateOnlineStatus = async (req, res) => {
  try {
    const { _id, is_online } = req.body;

    const validStatuses = ['true', 'false', 'busy'];
    if (!_id || !validStatuses.includes(is_online)) {
      return res.status(400).json({ message: 'is_online không hợp lệ' });
    }

    const normalizedStatus = String(is_online); // ép về string
    const updated = await Shipper.findOneAndUpdate(
      { _id },
      { is_online: normalizedStatus },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy shipper' });
    }

    res.json({ success: true, message: 'Cập nhật trạng thái online thành công', data: updated });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật trạng thái online:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

//------------------update Fix web admin---------------------
/**
 * Tạo shipper kèm Account từ web admin (không cần ảnh)
 * Route: POST /shippers/create-with-account (form-data: full_name, email, phone, ...)
 * Shipper sẽ tự sửa ảnh sau khi đăng nhập.
 */
module.exports.createShipperWithAccount = async (req, res) => {
  try {
    console.log('🔧 Web admin tạo shipper:', req.body);
    
    // Không cần xử lý ảnh, shipper tự sửa sau
    // Tái dùng hàm tạo hiện có (giữ nguyên business logic)
    return module.exports.createShipper(req, res);
  } catch (err) {
    console.error('createShipperWithAccount error:', err);
    return res.status(500).json({ msg: err.message });
  }
};
//-----------------Kết thúc Fix web admin---------------------
