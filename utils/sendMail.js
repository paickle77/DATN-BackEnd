const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'nhom6agile@gmail.com',
    pass: 'xdfi oyra niqp qpcg',
  },
  // Cải thiện cấu hình
  secure: true,
  tls: {
    rejectUnauthorized: false
  }
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
      <!-- Thêm meta tags để tránh spam -->
      <meta name="robots" content="noindex, nofollow">
      <meta name="format-detection" content="telephone=no">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
          <div style="width: 60px; height: 60px; background-color: #ffffff; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">🔐</span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Mã Xác Thực OTP</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">CakeShop - Bảo mật tài khoản</p>
        </div>

        <!-- Nội dung chính -->
        <div style="padding: 32px 24px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
            Xin chào,
          </p>
          
          <p style="color: #6b7280; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">
            Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản CakeShop. Vui lòng sử dụng mã OTP dưới đây để xác thực:
          </p>

          <!-- OTP Code -->
          <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Mã OTP</p>
            <div style="font-size: 28px; font-weight: 700; color: #4f46e5; letter-spacing: 4px; font-family: 'Courier New', monospace;">${otp}</div>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">Có hiệu lực trong 10 phút</p>
          </div>

          <!-- Hướng dẫn -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
              Lưu ý bảo mật:
            </p>
            <ul style="color: #92400e; margin: 0; padding-left: 16px; font-size: 13px;">
              <li>Mã OTP chỉ có hiệu lực trong 10 phút</li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
              <li>Nếu không phải bạn yêu cầu, hãy bỏ qua email này</li>
            </ul>
          </div>

          <p style="color: #9ca3af; font-size: 13px; line-height: 1.4; margin: 24px 0 0 0;">
            Nếu cần hỗ trợ, liên hệ: 
            <a href="mailto:support@cakeshop.com" style="color: #4f46e5; text-decoration: none;">support@cakeshop.com</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 13px;">
            © 2025 CakeShop. Tất cả quyền được bảo lưu.
          </p>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 11px;">
            Email này được gửi tự động từ hệ thống bảo mật.
          </p>
        </div>
      </div>

      <!-- Thêm text ẩn để cải thiện deliverability -->
      <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Mã xác thực OTP cho tài khoản CakeShop của bạn. Mã có hiệu lực trong 10 phút.
      </div>
    </body>
    </html>
    `;

    const textVersion = `
CakeShop - Mã Xác Thực OTP

Xin chào,

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản CakeShop.

Mã OTP của bạn là: ${otp}

LƯU Ý QUAN TRỌNG:
• Mã OTP có hiệu lực trong 10 phút
• Không chia sẻ mã này với bất kỳ ai
• Nếu không phải bạn yêu cầu, hãy bỏ qua email này

Cần hỗ trợ? Liên hệ: support@cakeshop.com

© 2025 CakeShop
    `;

    const result = await transporter.sendMail({
      from: {
        name: 'CakeShop Security',
        address: 'nhom6agile@gmail.com'
      },
      to: to,
      subject: '[CakeShop] Mã OTP Xác Thực Tài Khoản',
      text: textVersion,
      html: htmlTemplate,
      // Thêm headers để cải thiện deliverability
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': '<mailto:unsubscribe@cakeshop.com>',
        'X-Mailer': 'CakeShop Security System'
      },
      // Thêm category để tracking
      category: 'security',
      // Custom headers
      messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@cakeshop.com>`
    });

    console.log('Email đã gửi thành công:', result.messageId);
    return result;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    throw error;
  }
};