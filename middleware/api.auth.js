const jwt = require('jsonwebtoken');
const AccountModel = require('../models/account.model');
require('dotenv').config();

const api_auth = async (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(403).json({ error: 'Không xác định token' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.TOKEN_SEC_KEY);

    const account = await AccountModel.findById(payload._id);
    if (!account) throw new Error('Không tìm thấy tài khoản');

    if (account.is_lock) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    req.account = account; // ✅ gán account (không còn là req.user)
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message });
  }
};

// ✅ Phân quyền đúng theo role từ account
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.account || !roles.includes(req.account.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

module.exports = {
  api_auth,
  requireRole,
};
