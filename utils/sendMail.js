const nodemailer = require('nodemailer');
const express = require('express');
const app = express();
app.use(express.static('public'));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'khoangk412@gmail.com',
    pass: 'bjji wjze mfcp tpld', // App password từ Google
  },
});

exports.sendOTPEmail = async (to, otp) => {
  try {
    console.log('Đang gửi OTP email tới:', to);
    console.log('OTP code:', otp);
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã OTP Xác Thực</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f7fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header với logo/avatar -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <div style="width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <img src="https://i.postimg.cc/QNbNGzpW/logo.png" alt="Logo" style="width: 60px; height: 60px; border-radius: 50%; align-self: center;">
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Xác Thực OTP</h1>
          <p style="color: #e8f2ff; margin: 10px 0 0 0; font-size: 16px;">Bảo mật tài khoản của bạn</p>
        </div>

        <!-- Nội dung chính -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Chào bạn! 👋</h2>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP bên dưới để tiếp tục:
          </p>

          <!-- OTP Code Box -->
          <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px dashed #667eea; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
            <p style="color: #4a5568; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">MÃ OTP CỦA BẠN</p>
            <div style="font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
          </div>

          <!-- Thông tin quan trọng -->
<div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; border-radius: 4px; margin: 25px 0;">
            <p style="color: #742a2a; margin: 0; font-size: 14px; font-weight: 500;">
              ⚠️ <strong>Lưu ý quan trọng:</strong>
            </p>
            <ul style="color: #742a2a; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
              <li>Mã OTP có hiệu lực trong <strong>10 phút</strong></li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
              <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
            </ul>
          </div>

          <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 25px 0 0 0;">
            Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi tại 
            <a href="mailto:support@yourapp.com" style="color: #667eea; text-decoration: none;">support@yourapp.com</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; margin: 0; font-size: 14px;">
            © 2025 Your App Name. All rights reserved.
          </p>
          <p style="color: #a0aec0; margin: 5px 0 0 0; font-size: 12px;">
            Email này được gửi tự động, vui lòng không phản hồi.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textVersion = `
    🔐 MÃ OTP XÁC THỰC

    Chào bạn!

    Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

    Mã OTP của bạn là: ${otp}

    ⚠️ LƯU Ý QUAN TRỌNG:
    • Mã OTP có hiệu lực trong 10 phút
    • Không chia sẻ mã này với bất kỳ ai
    • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này

    Nếu cần hỗ trợ, liên hệ: support@yourapp.com

    © 2025 Your App Name
    Email này được gửi tự động, vui lòng không phản hồi.
  `;

    const result = await transporter.sendMail({
      from: '"🔐 CakeShop" <khoangk412@gmail.com>',
      to,
      subject: '🔐 Mã OTP Xác Thực - Đặt Lại Mật Khẩu',
      text: textVersion,
      html: htmlTemplate,
    });

    console.log('Email đã gửi thành công:', result.messageId);
    return result;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    throw error;
  }
};
