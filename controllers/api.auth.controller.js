const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Account = require('../models/account.model');       // model chứa email, password
const User = require('../models/user.model');            // profile user
const Shipper = require('../models/shipper.model');      // profile shipper
require('dotenv').config();

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const account = await Account.findOne({ email });

    if (!account) {
      return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    }

    // ✅ Kiểm tra xem mật khẩu có tồn tại và đúng định dạng
    if (!account.password || !account.password.startsWith('$2')) {
      return res.status(401).json({ error: 'Tài khoản không hợp lệ hoặc chưa hỗ trợ đăng nhập bằng mật khẩu' });
    }

    const match = await bcrypt.compare(password, account.password);
    if (!match) {
      return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    }

    const token = jwt.sign(
      { _id: account._id, role: account.role },
      process.env.TOKEN_SEC_KEY,
      { expiresIn: '8h' }
    );

    let profile = null;

    if (account.role === 'user' || account.role === 'admin') {
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
          role: account.role,
          is_lock: account.is_lock,
        },
        profile
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

    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }

    const hash = await bcrypt.hash(password, 10);

    // ❌ KHÔNG truyền role → MongoDB sẽ tự gán là 'user'
    const u = new UserModel({ email, password: hash, name });
    await u.save();

    res.json({ msg: 'OK', data: u });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};