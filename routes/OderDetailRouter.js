var express = require('express');
var router = express.Router();
var OderDetailController = require('../controlers/OderDetailController');

router.get('/oderdetails', OderDetailController.getList); 

module.exports = router;