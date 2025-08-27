// utils/admin.security.js - Queries cho Admin Dashboard

class AdminSecurityUtils {
  
  /**
   * 🚨 LỌC TẤT CẢ TÀI KHOẢN ĐÁNG NGỜ
   */
  static async getSuspiciousAccounts() {
    const Account = require('../models/account.model');
    
    return await Account.find({
      $or: [
        { login_attempts: { $gte: 3 } },              // Sai mật khẩu nhiều lần
        { suspicious_login_count: { $gte: 2 } },      // Đăng nhập đáng ngờ
        { locked_until: { $gt: new Date() } },        // Đang bị khóa
        { 
          last_login_ip: { 
            $regex: /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/ ,
            $options: 'i'
          } 
        }  // IP nội bộ đáng ngờ
      ]
    }).select('email role last_login_ip last_login_at login_attempts suspicious_login_count');
  }

  /**
   * 📱 LỌC TÀI KHOẢN ĐĂNG NHẬP NHIỀU THIẾT BỊ
   */
  static async getMultiDeviceAccounts() {
    const Account = require('../models/account.model');
    
    return await Account.aggregate([
      { $match: { refresh_tokens: { $exists: true, $ne: [] } } },
      { $addFields: { device_count: { $size: "$refresh_tokens" } } },
      { $match: { device_count: { $gte: 3 } } }, // 3+ thiết bị
      { 
        $project: {
          email: 1,
          role: 1,
          device_count: 1,
          last_login_at: 1,
          refresh_tokens: {
            $map: {
              input: "$refresh_tokens",
              as: "token",
              in: {
                device_info: "$$token.device_info",
                ip_address: "$$token.ip_address",
                last_used: "$$token.last_used"
              }
            }
          }
        }
      }
    ]);
  }

  /**
   * 🌍 LỌC ĐĂNG NHẬP TỪ IP LẠ (KHÁC QUỐC GIA)
   */
  static async getAnomalousIPLogins() {
    const Account = require('../models/account.model');
    
    // Lấy accounts có thay đổi IP đáng kể (VD: từ VN sang US)
    return await Account.find({
      $and: [
        { last_login_ip: { $ne: null } },
        { last_suspicious_ip: { $ne: null } },
        { suspicious_login_count: { $gte: 1 } }
      ]
    }).select('email last_login_ip last_suspicious_ip last_login_at suspicious_login_count');
  }

  /**
   * ⏰ LỌC TÀI KHOẢN KHÔNG HOẠT ĐỘNG LÂU
   */
  static async getInactiveAccounts(days = 30) {
    const Account = require('../models/account.model');
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await Account.find({
      $or: [
        { last_login_at: { $lt: cutoffDate } },
        { last_login_at: null }
      ]
    }).select('email role created_at last_login_at');
  }

  /**
   * 🔒 LỌC TÀI KHOẢN BỊ BRUTE FORCE
   */
  static async getBruteForceTargets() {
    const Account = require('../models/account.model');
    
    return await Account.find({
      login_attempts: { $gte: 5 }
    }).sort({ login_attempts: -1 })
      .select('email login_attempts locked_until last_login_ip');
  }

  /**
   * 📊 THỐNG KÊ TỔNG QUAN BẢO MẬT
   */
  static async getSecurityStats() {
    const Account = require('../models/account.model');
    
    const stats = await Account.aggregate([
      {
        $group: {
          _id: null,
          total_accounts: { $sum: 1 },
          
          // Accounts with multiple devices
          multi_device_accounts: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$refresh_tokens", []] } }, 2] },
                1, 0
              ]
            }
          },
          
          // Suspicious accounts
          suspicious_accounts: {
            $sum: {
              $cond: [{ $gte: ["$suspicious_login_count", 1] }, 1, 0]
            }
          },
          
          // Locked accounts
          locked_accounts: {
            $sum: {
              $cond: [{ $gt: ["$locked_until", new Date()] }, 1, 0]
            }
          },
          
          // Accounts with failed login attempts
          brute_force_targets: {
            $sum: {
              $cond: [{ $gte: ["$login_attempts", 3] }, 1, 0]
            }
          },
          
          // Recent logins (last 24h)
          recent_logins: {
            $sum: {
              $cond: [
                { $gt: ["$last_login_at", new Date(Date.now() - 24*60*60*1000)] },
                1, 0
              ]
            }
          }
        }
      }
    ]);
    
    return stats[0] || {};
  }

  /**
   * 🚀 API CHO ADMIN - Logout thiết bị từ xa
   */
  static async remoteLogoutDevice(accountId, deviceInfo) {
    const Account = require('../models/account.model');
    
    const account = await Account.findById(accountId);
    if (!account) return false;
    
    // Xóa refresh token của thiết bị cụ thể
    account.refresh_tokens = account.refresh_tokens.filter(
      token => token.device_info !== deviceInfo
    );
    
    await account.save();
    return true;
  }

  /**
   * 🚀 API CHO ADMIN - Logout tất cả thiết bị của user
   */
  static async logoutAllDevices(accountId) {
    const Account = require('../models/account.model');
    
    await Account.findByIdAndUpdate(accountId, {
      refresh_tokens: []
    });
    
    return true;
  }
}

module.exports = AdminSecurityUtils;
