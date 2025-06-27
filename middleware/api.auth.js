// middleware/api.auth.js
const jwt       = require('jsonwebtoken');
const UserModel = require('../models/user.model');
require('dotenv').config();

const api_auth = async (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(403).json({ error: 'Không xác định token' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.TOKEN_SEC_KEY);

    // Chỉ tìm theo _id, không bắt buộc phải đúng token stored
    const user = await UserModel.findById(payload._id);
    if (!user) throw new Error('Không xác định người dùng');

    // Nếu bạn muốn ép user phải unlock trước khi dùng API:
    if (user.is_lock) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    // Kiểm tra role admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }

    // Gắn user vào req và tiếp tục
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message });
  }
};

module.exports = { api_auth };
