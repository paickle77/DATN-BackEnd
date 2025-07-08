// const twilio = require('twilio');
// const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = process.env;
// const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// async function sendSMS(to, body) {
//   await client.messages.create({ from: TWILIO_FROM, to, body });
// }

// module.exports = { sendSMS };


async function sendSMS(to, body) {
  console.log('SMS giả, tới', to, ':', body);
}
module.exports = { sendSMS };
