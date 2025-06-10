var express = require('express');
var router = express.Router();
var productCtrl = require('../controlers/ProductController');

router.get('/products', productCtrl.getList); 
router.get('/products/:id', productCtrl.GetOne );
router.post('/products', productCtrl.Add );
router.put('/products/:id', productCtrl.Edit );
router.delete('/products/:id', productCtrl.Delete );
module.exports = router;