const Account = require('../models/account.model');
const bcrypt = require('bcryptjs');
const { sendOTPEmail } = require('../utils/sendMail');

const accountController = {};

// ✅ Gửi OTP để reset mật khẩu
accountController.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu email'
      });
    }

    // Tìm account
    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }

    // Kiểm tra account có phải local provider không (nếu có trường provider)
    if (account.provider && account.provider !== 'local') {
      return res.status(400).json({
        success: false,
        message: `Tài khoản này đăng nhập bằng ${account.provider}, không thể đổi mật khẩu`
      });
    }

    // Tạo OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    account.otp = otp;
    account.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    await account.save();

    // Gửi email
    await sendOTPEmail(email, otp);
    
    console.log('✅ Gửi OTP thành công cho:', email);

    res.json({ 
      success: true,
      message: 'OTP đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.' 
    });
  } catch (err) {
    console.error('❌ Lỗi gửi OTP:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi gửi OTP' 
    });
  }
};

// ✅ Xác thực OTP (optional - có thể bỏ nếu không cần)
accountController.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu email hoặc OTP'
      });
    }

    // Tìm account với OTP hợp lệ
    const account = await Account.findOne({ 
      email,
      otp, 
      otpExpires: { $gt: new Date() } 
    });
    
    if (!account) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP không hợp lệ hoặc đã hết hạn' 
      });
    }

    console.log('✅ Xác thực OTP thành công cho:', email);

    res.json({ 
      success: true,
      message: 'OTP hợp lệ. Bạn có thể đặt lại mật khẩu.',
      data: {
        account_id: account._id
      }
    });
  } catch (err) {
    console.error('❌ Lỗi xác thực OTP:', err);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi xác thực OTP' 
    });
  }
};

// ✅ Reset mật khẩu sau khi xác thực OTP
accountController.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết (email, otp, newPassword)'
      });
    }

    // Tìm account với OTP hợp lệ
    const account = await Account.findOne({ 
      email,
      otp, 
      otpExpires: { $gt: new Date() } 
    });
    
    if (!account) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP không hợp lệ hoặc đã hết hạn' 
      });
    }

    // Cập nhật mật khẩu mới
    account.password = await bcrypt.hash(newPassword, 10);
    account.otp = null; // Xóa OTP
    account.otpExpires = null; // Xóa thời gian hết hạn
    await account.save();

    console.log('✅ Reset mật khẩu thành công cho:', email);

    res.json({ 
      success: true,
      message: 'Mật khẩu đã được cập nhật thành công' 
    });
  } catch (err) {
    console.error('❌ Lỗi reset password:', err);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi cập nhật mật khẩu' 
    });
  }
};

// ✅ Đổi mật khẩu (khi đã đăng nhập)
accountController.changePassword = async (req, res) => {
  try {
    const { accountId, currentPassword, newPassword } = req.body;

    if (!accountId || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Thiếu thông tin đầu vào (accountId, currentPassword, newPassword)' 
      });
    }

    // Tìm account
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy tài khoản' 
      });
    }

    // Kiểm tra provider (nếu có)
    if (account.provider && account.provider !== 'local') {
      return res.status(400).json({ 
        success: false,
        message: `Tài khoản ${account.provider} không thể đổi mật khẩu` 
      });
    }

    // Kiểm tra mật khẩu hiện tại
    if (!account.password || !account.password.startsWith('$2')) {
      return res.status(400).json({ 
        success: false,
        message: 'Tài khoản không có mật khẩu hợp lệ' 
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, account.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Mật khẩu hiện tại không đúng' 
      });
    }

    // Cập nhật mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    account.password = hashedNewPassword;
    await account.save();

    console.log('✅ Đổi mật khẩu thành công cho account:', accountId);

    return res.json({ 
      success: true,
      message: 'Đổi mật khẩu thành công' 
    });
  } catch (err) {
    console.error('❌ Lỗi đổi mật khẩu:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Lỗi server' 
    });
  }
};

module.exports = accountController;