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

            // Tạo user mới
            const newUser = new User({
                name,
                email,
                image: image || null,
                password: password || null,
                provider: 'local',  // mặc định
            });

            // Nếu có google_id → là tài khoản Google
            if (google_id) {
                console.log('Google ID:', google_id);
                newUser.google_id = google_id;
                newUser.password = null;
                newUser.provider = 'google';
            }

            // Nếu có facebook_id → là tài khoản Facebook
            if (facebook_id) {
                newUser.facebook_id = facebook_id;
                newUser.password = null;
                newUser.provider = 'facebook';
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

// Xuất toàn bộ controller
module.exports = userController;
