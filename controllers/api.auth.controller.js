const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const Account = require('../models/account.model');
const User = require('../models/user.model');
const Shipper = require('../models/shipper.model');

// ───────── LOGIN ─────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const account = await Account.findOne({ email });
    if (!account) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

    const match = await bcrypt.compare(password, account.password);
    if (!match) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

    const token = jwt.sign(
      { _id: account._id, role: account.role },
      process.env.TOKEN_SEC_KEY,
      { expiresIn: '8h' }
    );

    let profile = null;
    if (account.role === 'user') {
      profile = await User.findOne({ account_id: account._id });
    } else if (account.role === 'shipper') {
      profile = await Shipper.findOne({ account_id: account._id });
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        account: {
          _id: account._id,
          email: account.email,
          role: account.role
        },
        profile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// ───────── REGISTER USER ─────────
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' });
    }

    const exists = await Account.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }

    const hash = await bcrypt.hash(password, 10);
    const account = new Account({
      email,
      password: hash,
      role: 'user',
      provider: 'local'
    });
    await account.save();

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        _id: account._id, // 👈 frontend cần key này
        email: account.email,
        role: account.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

