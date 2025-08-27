const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // ✅ THÊM: Crypto để hash token
require('dotenv').config();

class JWTUtils {
  /**
   * Tạo Access Token với thời hạn 8 tiếng
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, process.env.TOKEN_SEC_KEY, { expiresIn: '8h' });
  }

  /**
   * Tạo Refresh Token với thời hạn 7 ngày (có thể cấu hình 30 ngày)
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  }

  /**
   * ✅ THÊM: Hash refresh token trước khi lưu vào DB
   */
  static hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * ✅ THÊM: Verify refresh token với hash
   */
  static verifyRefreshTokenWithHash(token, hash) {
    const tokenHash = this.hashRefreshToken(token);
    return tokenHash === hash;
  }

  /**
   * Verify Access Token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.TOKEN_SEC_KEY);
    } catch (error) {
      throw new Error('Access token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Verify Refresh Token
   */
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Tạo cặp token (access + refresh) với chính sách khác nhau theo role và environment
   */
  static generateTokenPair(payload) {
    const isAdmin = payload.role === 'admin';
    const isDev = process.env.NODE_ENV === 'development';
    
    // ✅ LOCAL DEV: Token dài hơn để khỏi phải login liên tục
    let accessTokenExpiry, refreshTokenExpiry;
    
    if (isDev) {
      // Development: Token dài để dễ test
      accessTokenExpiry = isAdmin ? '24h' : '24h';    // Cả admin và user đều 24h trong dev
      refreshTokenExpiry = isAdmin ? '7d' : '30d';    // Admin: 7 ngày, User: 30 ngày trong dev
    } else {
      // Production: Security cao
      accessTokenExpiry = isAdmin ? '2h' : '8h';      // Admin: 2h, User: 8h
      refreshTokenExpiry = isAdmin ? '1d' : '7d';     // Admin: 1 ngày, User: 7 ngày
    }
    
    const accessToken = jwt.sign(payload, process.env.TOKEN_SEC_KEY, { 
      expiresIn: accessTokenExpiry 
    });
    
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { 
      expiresIn: refreshTokenExpiry 
    });
    
    // Tính expiry time
    const getMilliseconds = (expiry) => {
      if (expiry.includes('h')) return parseInt(expiry) * 60 * 60 * 1000;
      if (expiry.includes('d')) return parseInt(expiry) * 24 * 60 * 60 * 1000;
      return 0;
    };
    
    const accessTokenExpires = Date.now() + getMilliseconds(accessTokenExpiry);
    const refreshTokenExpires = Date.now() + getMilliseconds(refreshTokenExpiry);
    
    return {
      accessToken,
      refreshToken,
      accessTokenExpires,
      refreshTokenExpires
    };
  }

  /**
   * Lấy thông tin payload từ token mà không verify (để debug)
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = JWTUtils;
