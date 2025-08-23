// vnpay.controller.js
const Transaction = require("./vnpay.model");
const { createPaymentUrl, sortObject } = require("./vnpay.service");
const qs = require("qs");
const crypto = require("crypto");

exports.createPayment = async (req, res) => {
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    const orderId = Date.now().toString();
    const amount = parseInt(req.body.amount, 10);
    const bankCode = req.body.bankCode || null;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    const url = createPaymentUrl({ amount, bankCode, orderId, ipAddr });
    res.json({ paymentUrl: url });
  } catch (err) {
    console.error("❌ createPayment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.vnpayReturn = async (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const responseData = {
    vnp_TxnRef: vnp_Params["vnp_TxnRef"],
    vnp_Amount: parseInt(vnp_Params["vnp_Amount"]) / 100,
    vnp_OrderInfo: vnp_Params["vnp_OrderInfo"],
    vnp_ResponseCode: vnp_Params["vnp_ResponseCode"],
    vnp_TransactionNo: vnp_Params["vnp_TransactionNo"],
    vnp_TransactionStatus: vnp_Params["vnp_TransactionStatus"],
    vnp_BankCode: vnp_Params["vnp_BankCode"],
    vnp_PayDate: vnp_Params["vnp_PayDate"],
    verified: secureHash === signed
  };

  if (secureHash === signed) {
    await Transaction.create(responseData);
    return res.json({ 
      success: true,
      code: vnp_Params["vnp_ResponseCode"], 
      message: "Payment verified successfully",
      data: responseData
    });
  } else {
    return res.json({ 
      success: false,
      code: "97", 
      message: "Checksum failed",
      data: responseData
    });
  }
};
