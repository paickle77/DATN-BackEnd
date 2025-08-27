// utils/security.utils.js
const crypto = require('crypto');

class SecurityUtils {
  /**
   * ✅ Tạo refresh token với random component để tránh predictable
   */
  static generateSecureRefreshToken() {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    return crypto.createHash('sha256').update(randomBytes + timestamp).digest('hex');
  }

  /**
   * ✅ Rate limiting cho refresh token API
   */
  static rateLimitRefreshToken = new Map();
  
  static checkRefreshRateLimit(accountId) {
    const key = `refresh_${accountId}`;
    const now = Date.now();
    const attempts = this.rateLimitRefreshToken.get(key) || [];
    
    // Xóa attempts cũ hơn 15 phút
    const validAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
    
    // Chỉ cho phép 5 lần refresh trong 15 phút
    if (validAttempts.length >= 5) {
      return false;
    }
    
    validAttempts.push(now);
    this.rateLimitRefreshToken.set(key, validAttempts);
    return true;
  }

  /**
   * ✅ IP Whitelist/Blacklist
   */
  static checkIPSecurity(ip, userAgent) {
    // Implement IP validation logic
    // Block suspicious IPs, check geolocation changes, etc.
    return true; // Placeholder
  }

  /**
   * ✅ Device fingerprinting
   */
  static generateDeviceFingerprint(userAgent, ip) {
    const combined = `${userAgent}-${ip}`;
    return crypto.createHash('md5').update(combined).digest('hex');
  }
}

module.exports = SecurityUtils;
