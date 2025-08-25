const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  vnp_TxnRef: String,
  vnp_Amount: Number,
  vnp_OrderInfo: String,
  vnp_ResponseCode: String,
  vnp_TransactionNo: String,
  vnp_TransactionStatus: String,
  vnp_BankCode: String,
  vnp_PayDate: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);