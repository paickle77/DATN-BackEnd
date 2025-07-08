const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: +SMTP_PORT,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

async function sendEmail(to, subject, text) {
  await transporter.sendMail({ from: SMTP_USER, to, subject, text });
}

module.exports = { sendEmail };
