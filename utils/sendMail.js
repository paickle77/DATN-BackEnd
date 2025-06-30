const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'khoangk412@gmail.com',
    pass: 'bjji wjze mfcp tpld', // Tạo app password từ Google
  },
});

exports.sendOTPEmail = async (to, otp) => {
  await transporter.sendMail({
    from: '"App Support" <your-email@gmail.com>',
    to,
    subject: 'Mã OTP đặt lại mật khẩu',
    text: `Mã OTP của bạn là: ${otp}. OTP có hiệu lực trong 10 phút.`,
  });
};
