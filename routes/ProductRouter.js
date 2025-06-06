var express = require('express');
var router = express.Router();
var productCtrl = require('../controlers/ProductController');

router.get('/products', productCtrl.getList); 

module.exports = router;