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
//------------------update Fix web admin---------------------  
  // 🔥 THÊM CÁC TRƯỜNG CHO HOÀN TIỀN
  refund_request_id: String,
  refund_date: Date,
  is_sandbox: { type: Boolean, default: false },
//-----------------Kết thúc Fix web admin---------------------
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);