const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose'); // ✅ Thêm import mongoose
const { sendOTPEmail } = require('../utils/sendMail');

// Tạo controller từ base
const Base = require('./base.controller');
const userController = Base(User);

// ✅ SỬA: Tạo hồ sơ user profile
userController.createUserProfile = async (req, res) => {
  try {
    const { account_id, name, phone, gender, avatar } = req.body;

    console.log('📝 Tạo profile với data:', { account_id, name, phone, gender, avatar });

    if (!account_id || !name || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin cá nhân (account_id, name, phone)' 
      });
    }

    // ✅ Kiểm tra user đã tồn tại chưa
    const exists = await User.findOne({ account_id });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tài khoản này đã có hồ sơ người dùng' 
      });
    }

    // ✅ Tạo user mới
    const user = new User({
      account_id: new mongoose.Types.ObjectId(account_id),
      name,
      phone,
      gender,
      avatar: avatar || 'avatarmacdinh.png'
    });

    await user.save();

    console.log('✅ Tạo user profile thành công:', user._id);

    res.status(201).json({
      success: true,
      message: 'Đã tạo hồ sơ người dùng thành công',
      data: {
        _id: user._id.toString(),
        account_id: user.account_id.toString(),
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('❌ Lỗi tạo user profile:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ✅ SỬA: Lấy thông tin user theo account_id 
userController.getByAccountId = async (req, res) => {
  try {
    const { account_id } = req.params;
    console.log('🔍 Tìm user với account_id:', account_id);

    const user = await User.findOne({ account_id });
    if (!user) {
      console.log('❌ Không tìm thấy user với account_id:', account_id);
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy user' 
      });
    }

    console.log('✅ Tìm thấy user:', user._id);
    return res.json({ 
      success: true, 
      data: user 
    });
  } catch (err) {
    console.error('❌ Lỗi khi tìm user theo account_id:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};

// ✅ Override method Add để hỗ trợ Google và Facebook login
userController.Add = async (req, res) => {
  try {
    const { name, email, password, image, google_id, facebook_id } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Thiếu email.' });
    }

    // Kiểm tra user đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) {
      return res.status(200).json({
        success: true,
        message: 'Tài khoản đã tồn tại',
        data: user
      });
    }

    const newUser = new User({
      name,
      email,
      image: image || null,
      provider: 'local',
    });

    // Google login
    if (google_id) {
      newUser.google_id = google_id;
      newUser.provider = 'google';
      newUser.password = null;
    }
    // Facebook login
    else if (facebook_id) {
      newUser.facebook_id = facebook_id;
      newUser.provider = 'facebook';
      newUser.password = null;
    }
    // Local registration
    else {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Thiếu mật khẩu.' });
      }

      const hash = await bcrypt.hash(password, 10);
      newUser.password = hash;
      newUser.provider = 'local';
    }

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        provider: newUser.provider,
        google_id: newUser.google_id,
        facebook_id: newUser.facebook_id,
      }
    });

  } catch (err) {
    console.error('Lỗi khi thêm user:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


module.exports = userController;