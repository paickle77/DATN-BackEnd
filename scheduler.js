// scheduler.js
require('dotenv').config();
const cron      = require('node-cron');
const nodemailer = require('nodemailer');
const api       = require('./routes/api');        // nếu bạn cần gọi service
const db        = require('./models/db');                // ensure DB đã connect

// ví dụ generateReportBuffer lấy Excel/PDF từ service của bạn
const { generateReportBuffer } = require('./services/report.service');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

cron.schedule('0 8 * * *', async () => {
  try {
    console.log('[Scheduler] Bắt đầu gửi báo cáo tự động...');
    const buf = await generateReportBuffer();  // bạn tự triển khai trong report.service.js
    await transporter.sendMail({
      from: `"CakeShop" <${process.env.SMTP_USER}>`,
      to:   process.env.REPORT_RECEIVER,        // ví dụ boss@cakeshop.com
      subject: '📊 Báo cáo doanh thu hàng ngày',
      text:    'Đính kèm báo cáo doanh thu.',
      attachments: [
        { filename: 'Report.xlsx', content: buf }
      ]
    });
    console.log('[Scheduler] Đã gửi báo cáo thành công');
  } catch (err) {
    console.error('[Scheduler] Lỗi khi gửi báo cáo:', err);
  }
});
