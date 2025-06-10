var express = require('express');
var router = express.Router();
var ReviewController = require('../controlers/ReviewController');

router.get('/reviews', ReviewController.getList); 

module.exports = router;