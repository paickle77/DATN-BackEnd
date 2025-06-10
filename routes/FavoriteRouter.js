var express = require('express');
var router = express.Router();
var FavoriteCtrl = require('../controlers/FavoriteController');

router.get('/favorites', FavoriteCtrl.getList); 

module.exports = router;