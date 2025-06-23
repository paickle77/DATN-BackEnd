// routes/api.js
const express            = require('express');
const router             = express.Router();
const mdw                = require('../middleware/api.auth');

// Controllers
const userCtrl           = require('../controllers/api.user.controller');
const addressCtrl        = require('../controllers/api.address.controller');
const cartCtrl           = require('../controllers/api.cart.controller');
const favoriteCtrl       = require('../controllers/api.favorite.controller');
const notificationCtrl   = require('../controllers/api.notification.controller');
const logCtrl            = require('../controllers/api.log.controller');
const voucherCtrl        = require('../controllers/api.voucher.controller');
const orderCtrl          = require('../controllers/api.order.controller');
const orderDetailCtrl    = require('../controllers/api.orderDetail.controller');
const paymentCtrl        = require('../controllers/api.payment.controller');
const reviewCtrl         = require('../controllers/api.review.controller');
const ingredientCtrl     = require('../controllers/api.ingredient.controller');
const branchCtrl         = require('../controllers/api.branch.controller');
const categoryCtrl       = require('../controllers/api.category.controller');
const productCtrl        = require('../controllers/api.product.controller');
const sizeCtrl           =require('../controllers/size.controller');

// ——— CRUD cho User ———
router.get   ('/users',        userCtrl.getList);
router.get   ('/users/:id',    userCtrl.GetOne);
router.post  ('/users',        userCtrl.Add);
router.put   ('/users/:id',    userCtrl.Edit);
router.delete('/users/:id',    userCtrl.Delete);

// ——— CRUD cho Addresses ———
router.get   ('/addresses',     addressCtrl.getList);
router.get   ('/addresses/:id', addressCtrl.GetOne);
router.post  ('/addresses',     addressCtrl.Add);
router.put   ('/addresses/:id', addressCtrl.Edit);
router.delete('/addresses/:id', addressCtrl.Delete);

// ——— CRUD cho Carts ———
router.get   ('/carts',        cartCtrl.getList);
router.get   ('/carts/:id',    cartCtrl.GetOne);
router.post  ('/carts',        cartCtrl.Add);
router.put   ('/carts/:id',    cartCtrl.Edit);
router.delete('/carts/:id',    cartCtrl.Delete);

// ——— CRUD cho Favorites ———
router.get   ('/favorites',     favoriteCtrl.getList);
router.get   ('/favorites2',     favoriteCtrl.GetFavoriteandNameProduct2);
router.get   ('/favorites/:id', favoriteCtrl.GetOne);
router.post  ('/favorites',     favoriteCtrl.Add);
router.put   ('/favorites/:id', favoriteCtrl.Edit);
router.delete('/favorites/:id', favoriteCtrl.Delete);

// ——— CRUD cho Notifications ———
router.get   ('/notifications',     notificationCtrl.getList);
router.get   ('/notifications/:id', notificationCtrl.GetOne);
router.post  ('/notifications',     notificationCtrl.Add);
router.put   ('/notifications/:id', notificationCtrl.Edit);
router.delete('/notifications/:id', notificationCtrl.Delete);

// ——— CRUD cho Logs ———
router.get   ('/logs',     logCtrl.getList);
router.get   ('/logs/:id', logCtrl.GetOne);
router.post  ('/logs',     logCtrl.Add);
router.put   ('/logs/:id', logCtrl.Edit);
router.delete('/logs/:id', logCtrl.Delete);

// ——— CRUD cho Vouchers ———
router.get   ('/vouchers',     voucherCtrl.getList);
router.get   ('/vouchers/:id', voucherCtrl.GetOne);
router.post  ('/vouchers',     voucherCtrl.Add);
router.put   ('/vouchers/:id', voucherCtrl.Edit);
router.delete('/vouchers/:id', voucherCtrl.Delete);

// ——— CRUD cho Orders ———
router.get   ('/orders',     orderCtrl.getList);
router.get   ('/orders/:id', orderCtrl.GetOne);
router.post  ('/orders',     orderCtrl.Add);
router.put   ('/orders/:id', orderCtrl.Edit);
router.delete('/orders/:id', orderCtrl.Delete);

// ——— CRUD cho Order Details ———
router.get   ('/orderDetails',     orderDetailCtrl.getList);
router.get   ('/orderDetails/:id', orderDetailCtrl.GetOne);
router.post  ('/orderDetails',     orderDetailCtrl.Add);
router.put   ('/orderDetails/:id', orderDetailCtrl.Edit);
router.delete('/orderDetails/:id', orderDetailCtrl.Delete);

// ——— CRUD cho Payments ———
router.get   ('/payments',     paymentCtrl.getList);
router.get   ('/payments/:id', paymentCtrl.GetOne);
router.post  ('/payments',     paymentCtrl.Add);
router.put   ('/payments/:id', paymentCtrl.Edit);
router.delete('/payments/:id', paymentCtrl.Delete);

// ——— CRUD cho Reviews ———
router.get   ('/reviews',     reviewCtrl.getList);
router.get   ('/reviews/:id', reviewCtrl.GetOne);
router.post  ('/reviews',     reviewCtrl.Add);
router.put   ('/reviews/:id', reviewCtrl.Edit);
router.delete('/reviews/:id', reviewCtrl.Delete);

// ——— CRUD cho Ingredients ———
router.get   ('/ingredients',     ingredientCtrl.getList);
router.get   ('/ingredients/:id', ingredientCtrl.GetOne);
router.post  ('/ingredients',     ingredientCtrl.Add);
router.put   ('/ingredients/:id', ingredientCtrl.Edit);
router.delete('/ingredients/:id', ingredientCtrl.Delete);

// ——— CRUD cho Branches ———
router.get   ('/branches',     branchCtrl.getList);
router.get   ('/branches/:id', branchCtrl.GetOne);
router.post  ('/branches',     branchCtrl.Add);
router.put   ('/branches/:id', branchCtrl.Edit);
router.delete('/branches/:id', branchCtrl.Delete);

// ——— CRUD cho Categories ———
router.get   ('/categories',     categoryCtrl.getList);
router.get   ('/categories/:id', categoryCtrl.GetOne);
router.post  ('/categories',     categoryCtrl.Add);
router.put   ('/categories/:id', categoryCtrl.Edit);
router.delete('/categories/:id', categoryCtrl.Delete);

// ——— CRUD cho Products ———
router.get   ('/products',     productCtrl.getList);
router.get   ('/productscategory',     productCtrl.GetListByCategory);
router.get   ('/productsandcategoryid',productCtrl.getProductAndCategoryName);
router.get   ('/productsandintergradianID',productCtrl.getProductAndIngredientName);
router.get   ('/products/:id', productCtrl.GetOne);
router.post  ('/products',     productCtrl.Add);
router.put   ('/products/:id', productCtrl.Edit);
router.delete('/products/:id', productCtrl.Delete);

// ——— Các route custom cho Product ———
router.get('/products/categories/:id', productCtrl.GetListByCategory);
router.get('/products/search',         productCtrl.SearchByName);


// ——— CRUD cho sizes ———
router.get   ('/sizes',        sizeCtrl.getList);
router.get   ('/sizes/:id',    sizeCtrl.GetOne);
router.post  ('/sizes',        sizeCtrl.Add);
router.put   ('/sizes/:id',    sizeCtrl.Edit);
router.delete('/sizes/:id',    sizeCtrl.Delete);


module.exports = router;
