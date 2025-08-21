// src/utils/payment.js
/**
 * processRefund: giả lập gọi payment gateway để hoàn tiền
 * @param {string} orderId  – ID đơn hàng cần hoàn
 * @param {number} amount   – số tiền hoàn lại
 */
async function processRefund(orderId, amount) {
  // TODO: tích hợp API của gateway ở đây
  console.log(`Hoàn tiền ${amount} cho order ${orderId}`);
  return { success: true };
}

module.exports = { processRefund };
