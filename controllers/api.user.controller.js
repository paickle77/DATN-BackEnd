const Base = require('./base.controller');
const User = require('../models/user.model');

// Lấy các method cơ bản từ Base controller
const baseController = Base(User);

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