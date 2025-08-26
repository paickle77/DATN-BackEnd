// vnpay.routes.js
const router = require("express").Router();
const vnpayController = require("./vnpay.controller");

// Tạo link thanh toán
router.post("/create", vnpayController.createPayment);

// Callback trả về sau thanh toán
router.get("/return", vnpayController.vnpayReturn);

//------------------update Fix web admin---------------------
// 🔥 API HOÀN TIỀN VNPAY
router.post("/refund", vnpayController.processRefund);

// 🔥 API TRUY VẤN TRẠNG THÁI GIAO DỊCH
router.post("/query", vnpayController.queryTransaction);
//-----------------Kết thúc Fix web admin---------------------

module.exports = router;