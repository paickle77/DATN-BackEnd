var express = require('express');
var router = express.Router();
var CustomerCtrl = require('../controlers/CustomerController');

router.get('/customer', CustomerCtrl.getList); 

module.exports = router;