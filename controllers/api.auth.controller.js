const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Account = require('../models/account.model');       // model chứa email, password
const User = require('../models/user.model');            // profile user
const Shipper = require('../models/shipper.model');      // profile shipper
const JWTUtils = require('../utils/jwt.utils');          // ✅ THÊM: JWT utilities
require('dotenv').config();


// ───────── LOGIN ─────────
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
      // ✅ LOCAL DEV: Giảm security cho dễ test
      if (process.env.NODE_ENV === 'development') {
        return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
      }
      
      // ✅ PRODUCTION: Track failed login attempts (quan trọng hơn user)
      account.login_attempts = (account.login_attempts || 0) + 1;
      
      const maxAttempts = account.role === 'admin' ? 3 : 5;
      const lockDuration = account.role === 'admin' ? 30 : 15;
      
      if (account.login_attempts >= maxAttempts) {
        account.locked_until = new Date(Date.now() + lockDuration * 60 * 1000);
        await account.save();
        
        return res.status(401).json({ 
          error: `Tài khoản ${account.role} bị khóa ${lockDuration} phút do nhập sai mật khẩu ${maxAttempts} lần` 
        });
      }
      
      await account.save();
      return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    }

    // ✅ LOCAL DEV: Skip IP whitelist check
    if (process.env.NODE_ENV !== 'development') {
      const currentClientIP = req.ip || req.connection.remoteAddress || 'Unknown IP';
      if (account.role === 'admin') {
        const isAllowedIP = await this.checkAdminIPWhitelist(currentClientIP);
        if (!isAllowedIP) {
          account.suspicious_login_count = (account.suspicious_login_count || 0) + 1;
          account.last_suspicious_ip = currentClientIP;
          await account.save();
          
          return res.status(403).json({ 
            error: 'Admin chỉ có thể đăng nhập từ IP được phép. IP của bạn đã được ghi nhận.' 
          });
        }
      }
    }

    // ✅ SỬA: Tạo cặp token thay vì single token
    const tokenPayload = { _id: account._id, role: account.role };
    const { accessToken, refreshToken, accessTokenExpires, refreshTokenExpires } = JWTUtils.generateTokenPair(tokenPayload);

    // ✅ MULTI-DEVICE: Lấy thông tin thiết bị và IP
    const userAgent = req.get('User-Agent') || 'Unknown Device';
    const clientIP = req.ip || req.connection.remoteAddress || 'Unknown IP';
    
    // ✅ BẢOMẬT: Tạo refresh token entry cho thiết bị này
    const refreshTokenHash = JWTUtils.hashRefreshToken(refreshToken);
    const newRefreshToken = {
      token_hash: refreshTokenHash,
      expires_at: new Date(refreshTokenExpires),
      device_info: userAgent,
      ip_address: clientIP,
      created_at: new Date(),
      last_used: new Date()
    };

    // ✅ MULTI-DEVICE: Thêm token vào array (giữ tối đa thiết bị theo env)
    if (!account.refresh_tokens) account.refresh_tokens = [];
    
    // Xóa tokens hết hạn
    account.refresh_tokens = account.refresh_tokens.filter(
      token => new Date() < token.expires_at
    );
    
    // ✅ LOCAL DEV: Cho phép nhiều thiết bị hơn để test
    const maxDevices = process.env.NODE_ENV === 'development' 
      ? (account.role === 'admin' ? 10 : 10)  // Dev: 10 thiết bị cho cả admin và user
      : (account.role === 'admin' ? 2 : 5);   // Prod: Admin 2, User 5
    
    if (account.refresh_tokens.length >= maxDevices) {
      // Xóa token cũ nhất
      account.refresh_tokens.sort((a, b) => a.last_used - b.last_used);
      account.refresh_tokens.shift();
    }
    
    account.refresh_tokens.push(newRefreshToken);
    
    // ✅ Cập nhật thông tin login
    account.last_login_ip = clientIP;
    account.last_login_device = userAgent;
    account.last_login_at = new Date();
    account.login_attempts = 0; // Reset failed attempts
    
    await account.save();

    // 🔍 DEBUG: Log tokens khi login thành công
    console.log('\n🚀 ===== LOGIN SUCCESS =====');
    console.log(`📧 User: ${account.email} (${account.role})`);
    console.log(`📱 Device: ${userAgent}`);
    console.log(`🌍 IP: ${clientIP}`);
    console.log(`⏰ Time: ${new Date().toLocaleString('vi-VN')}`);
    console.log('\n🔑 ACCESS TOKEN (8h):');
    console.log(accessToken);
    console.log('\n🔄 REFRESH TOKEN (7-30 days):');
    console.log(refreshToken);
    console.log(`\n📅 Access expires: ${new Date(accessTokenExpires).toLocaleString('vi-VN')}`);
    console.log(`📅 Refresh expires: ${new Date(refreshTokenExpires).toLocaleString('vi-VN')}`);
    console.log(`🔐 Token hash in DB: ${refreshTokenHash.substring(0, 20)}...`);
    console.log('===========================\n');

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
        accessToken,
        refreshToken,
        accessTokenExpires,
        refreshTokenExpires,
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

    // ✅ THÊM: Tạo cặp token cho user mới đăng ký
    const tokenPayload = { _id: account._id, role: account.role };
    const { accessToken, refreshToken, accessTokenExpires, refreshTokenExpires } = JWTUtils.generateTokenPair(tokenPayload);

    // ✅ MULTI-DEVICE: Lưu refresh token vào array như login
    const userAgent = req.get('User-Agent') || 'Unknown Device';
    const clientIP = req.ip || req.connection.remoteAddress || 'Unknown IP';
    
    const refreshTokenHash = JWTUtils.hashRefreshToken(refreshToken);
    const newRefreshToken = {
      token_hash: refreshTokenHash,
      expires_at: new Date(refreshTokenExpires),
      device_info: userAgent,
      ip_address: clientIP,
      created_at: new Date(),
      last_used: new Date()
    };

    // Khởi tạo array nếu chưa có
    if (!account.refresh_tokens) account.refresh_tokens = [];
    account.refresh_tokens.push(newRefreshToken);
    
    await account.save();

    // 🔍 DEBUG: Log tokens khi register thành công
    console.log('\n✨ ===== REGISTER SUCCESS =====');
    console.log(`📧 New User: ${account.email}`);
    console.log(`👤 Role: ${account.role}`);
    console.log(`⏰ Time: ${new Date().toLocaleString('vi-VN')}`);
    console.log('\n🔑 ACCESS TOKEN (8h):');
    console.log(accessToken);
    console.log('\n🔄 REFRESH TOKEN (7 days):');
    console.log(refreshToken);
    console.log(`\n📅 Access expires: ${new Date(accessTokenExpires).toLocaleString('vi-VN')}`);
    console.log(`📅 Refresh expires: ${new Date(refreshTokenExpires).toLocaleString('vi-VN')}`);
    console.log(`🔐 Token hash in DB: ${refreshTokenHash.substring(0, 20)}...`);
    console.log('==============================\n');

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        _id: account._id, // 👈 frontend cần key này
        email: account.email,
        role: account.role,
        accessToken,
        refreshToken,
        accessTokenExpires,
        refreshTokenExpires
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ───────── REFRESH TOKEN ─────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token không được cung cấp' });
    }

    // ✅ Verify refresh token
    let payload;
    try {
      payload = JWTUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }

    // ✅ Tìm account
    const account = await Account.findById(payload._id);
    if (!account) {
      return res.status(401).json({ error: 'Account không tồn tại' });
    }

    // ✅ MULTI-DEVICE: Tìm refresh token trong array
    const refreshTokenHash = JWTUtils.hashRefreshToken(refreshToken);
    const tokenIndex = account.refresh_tokens?.findIndex(
      token => token.token_hash === refreshTokenHash && new Date() < token.expires_at
    );

    if (tokenIndex === -1 || !account.refresh_tokens) {
      return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }

    // ✅ Tạo cặp token mới
    const tokenPayload = { _id: account._id, role: account.role };
    const { accessToken, refreshToken: newRefreshToken, accessTokenExpires, refreshTokenExpires } = JWTUtils.generateTokenPair(tokenPayload);

    // ✅ MULTI-DEVICE: Cập nhật token trong array
    const newRefreshTokenHash = JWTUtils.hashRefreshToken(newRefreshToken);
    account.refresh_tokens[tokenIndex] = {
      token_hash: newRefreshTokenHash,
      expires_at: new Date(refreshTokenExpires),
      device_info: account.refresh_tokens[tokenIndex].device_info,
      ip_address: account.refresh_tokens[tokenIndex].ip_address,
      created_at: account.refresh_tokens[tokenIndex].created_at,
      last_used: new Date() // ✅ Cập nhật last_used
    };
    
    await account.save();

    // 🔍 DEBUG: Log refresh token thành công
    console.log('\n🔄 ===== REFRESH TOKEN SUCCESS =====');
    console.log(`📧 User: ${account.email} (${account.role})`);
    console.log(`📱 Device: ${account.refresh_tokens[tokenIndex].device_info}`);
    console.log(`⏰ Time: ${new Date().toLocaleString('vi-VN')}`);
    console.log('\n🆕 NEW ACCESS TOKEN (8h):');
    console.log(accessToken);
    console.log('\n🆕 NEW REFRESH TOKEN (7-30 days):');
    console.log(newRefreshToken);
    console.log(`🔐 New token hash: ${newRefreshTokenHash.substring(0, 20)}...`);
    console.log('====================================\n');

    res.json({
      success: true,
      message: 'Refresh token thành công',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        accessTokenExpires,
        refreshTokenExpires
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// ───────── LOGOUT ─────────
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // ✅ MULTI-DEVICE: Tìm và xóa token khỏi array
      const refreshTokenHash = JWTUtils.hashRefreshToken(refreshToken);
      
      // Tìm tất cả accounts có token này (trong trường hợp multi-user trên cùng device)
      const accounts = await Account.find({
        'refresh_tokens.token_hash': refreshTokenHash
      });
      
      for (const account of accounts) {
        // Xóa token khỏi array
        account.refresh_tokens = account.refresh_tokens.filter(
          token => token.token_hash !== refreshTokenHash
        );
        await account.save();
      }

      console.log(`🚪 Đăng xuất: Đã xóa ${accounts.length} refresh token`);
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// ✅ ADMIN SECURITY: Kiểm tra IP whitelist cho admin
exports.checkAdminIPWhitelist = async (ip) => {
  // ✅ Danh sách IP được phép cho admin (có thể lưu trong DB hoặc env)
  const allowedIPs = [
    '127.0.0.1',          // localhost
    '::1',                // localhost IPv6
    '192.168.1.0/24',     // Local network
    '10.0.0.0/8',         // Private network
    // Thêm IP công ty, VPN, etc...
  ];
  
  // ✅ Development: Cho phép tất cả IP (chỉ trong dev)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // ✅ Production: Kiểm tra IP whitelist
  const isWhitelisted = allowedIPs.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation check (cần thư viện ip-range-check)
      return ip.startsWith(allowedIP.split('/')[0].slice(0, -1));
    }
    return ip === allowedIP;
  });
  
  return isWhitelisted;
};