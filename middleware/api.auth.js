const jwt = require('jsonwebtoken');
const AccountModel = require('../models/account.model');
const JWTUtils = require('../utils/jwt.utils'); // ✅ THÊM: Import JWT utils
require('dotenv').config();

const api_auth = async (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(403).json({ error: 'Không xác định token' });
  }

  const token = header.replace('Bearer ', '');
  try {
    // ✅ SỬA: Sử dụng JWTUtils để verify access token
    const payload = JWTUtils.verifyAccessToken(token);

    const account = await AccountModel.findById(payload._id);
    if (!account) throw new Error('Không tìm thấy tài khoản');

    if (account.is_lock) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    req.account = account; // ✅ gán account (không còn là req.user)
    next();
  } catch (err) {
    console.error(err);
    
    // ✅ THÊM: Phân biệt lỗi token hết hạn và lỗi khác
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access token đã hết hạn', 
        code: 'TOKEN_EXPIRED',
        message: 'Vui lòng sử dụng refresh token để lấy token mới'
      });
    }
    
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
