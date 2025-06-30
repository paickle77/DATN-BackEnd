// controllers/api.auth.controller.js
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcrypt');
const UserModel = require('../models/user.model');
require('dotenv').config();

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.TOKEN_SEC_KEY,
      { expiresIn: '8h' }
    );

    user.token = token;
    await user.save();

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};


exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' });
    }

    const exists = await UserModel.findOne({ email });  // DÙNG UserModel
    if (exists) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }

    const hash = await bcrypt.hash(password, 10);
    // DÙNG UserModel để khởi tạo
    const u = new UserModel({ email, password: hash, name, role: 'admin' });
    await u.save();

    res.json({ msg: 'OK', data: u });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
