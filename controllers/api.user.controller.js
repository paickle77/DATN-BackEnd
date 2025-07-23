const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { sendOTPEmail } = require('../utils/sendMail'); // giả sử bạn có file này

// Tạo controller từ base
const Base = require('./base.controller');
const userController = Base(User);
const baseController = require('./base.controller')(User);

module.exports = {
    // Giữ nguyên các method cơ bản
    getList: baseController.getList,
    GetOne: baseController.GetOne,
    Edit: baseController.Edit,
    Delete: baseController.Delete,
    

    // Override method Add để hỗ trợ Google và Facebook login
    Add: async (req, res) => {
  try {
    const { name, email, password, image, google_id, facebook_id } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Thiếu email.' });
    }

    // Kiểm tra user đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) {
      return res.status(200).json({
        success: true,
        message: 'Tài khoản đã tồn tại',
        id: user._id
      });
    }

    const newUser = new User({
      name,
      email,
      image: image || null,
      provider: 'local', // mặc định
    });

    // ✅ Trường hợp Google login
    if (google_id) {
      newUser.google_id = google_id;
      newUser.provider = 'google';
      newUser.password = null;
    }

    // ✅ Trường hợp Facebook login
    else if (facebook_id) {
      newUser.facebook_id = facebook_id;
      newUser.provider = 'facebook';
      newUser.password = null;
    }

    // ✅ Trường hợp Local (email + password)
    else {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Thiếu mật khẩu.' });
      }

      const hash = await bcrypt.hash(password, 10);
      newUser.password = hash;
      newUser.provider = 'local';
    }

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        provider: newUser.provider,
        google_id: newUser.google_id,
        facebook_id: newUser.facebook_id,
      }
    });

  } catch (err) {
    console.error('Lỗi khi thêm user:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}


};

// Thêm hàm mở rộng: gửi OTP
userController.sendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Email không tồn tại' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    await user.save();

    await sendOTPEmail(email, otp); // hàm gửi email bằng nodemailer
    res.json({ msg: 'OTP đã gửi về email' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Thêm hàm mở rộng: reset mật khẩu
userController.resetPassword = async (req, res) => {
  const { otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ otp, otpExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ msg: 'OTP không hợp lệ hoặc đã hết hạn' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ msg: 'Mật khẩu đã được cập nhật' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }

};

// Thêm hàm mở rộng: đổi mật khẩu
userController.changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin đầu vào.' });
    }

    const user = await User.findById(userId);
    if (!user || !user.password || !user.password.startsWith('$2')) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.json({ message: 'Cập nhật mật khẩu thành công.' });
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
};



module.exports = userController;
