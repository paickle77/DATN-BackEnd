// const nodemailer = require('nodemailer');
// const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

// const transporter = nodemailer.createTransport({
//   host: SMTP_HOST,
//   port: +SMTP_PORT,
//   auth: { user: SMTP_USER, pass: SMTP_PASS }
// });

// async function sendEmail(to, subject, text) {
//   await transporter.sendMail({ from: SMTP_USER, to, subject, text });
// }

// module.exports = { sendEmail };


// utils/mail.js
const nodemailer = require('nodemailer');
let transporter;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({ 
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // fallback: không gửi mail
  transporter = { sendMail: () => Promise.resolve() };
}
async function sendEmail(to, subject, text) {
  return transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
}
module.exports = { sendEmail };
