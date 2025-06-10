var express = require('express');
var router = express.Router();
var OderCtrl = require('../controlers/OrderController');

router.get('/oders', OderCtrl.getList); 

module.exports = router;