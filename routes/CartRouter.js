var express = require('express');
var router = express.Router();
var CartCtrl = require('../controlers/CartController');

router.get('/carts', CartCtrl.getList); 

module.exports = router;