var express = require('express');
var router = express.Router();
var PaymentCtrl = require('../controlers/PaymentController');

router.get('/payments', PaymentCtrl.getList); 

module.exports = router;