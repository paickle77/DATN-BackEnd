const jwt = require('jsonwebtoken');
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
    const user = await UserModel.findById(payload._id);
    if (!user) throw new Error('Không xác định người dùng');

    if (user.is_lock) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    req.user = user; // Cho phép cả admin và user
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message });
  }
};

// Middleware phân quyền riêng
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

module.exports = {
  api_auth,
  requireRole,
};
