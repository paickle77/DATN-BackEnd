// vnpay.routes.js
const router = require("express").Router();
const vnpayController = require("./vnpay.controller");

// Tạo link thanh toán
router.post("/create", vnpayController.createPayment);

// Callback trả về sau thanh toán
router.get("/return", vnpayController.vnpayReturn);

module.exports = router;