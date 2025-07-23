const express = require('express');
const router = express.Router();
const { api_auth, requireRole } = require('../middleware/api.auth');

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
const authCtrl           = require('../controllers/api.auth.controller');
const billCtrl           = require('../controllers/api.bill.controller');
const billdetails    = require('../controllers/api.billdetails.controller');

// Controllers...
// (giữ nguyên phần import như cũ)

// 1️⃣ Các route public (không cần token)
router.post('/login', authCtrl.login);
router.post('/register', authCtrl.register);

// 2️⃣ Tất cả các route phía dưới đây đều bảo vệ bằng middleware api_auth
// router.use(mdw.api_auth);
router.post('/users/send-otp', userCtrl.sendOTP);
router.post('/users/reset-password', userCtrl.resetPassword);
router.post('/users/change-password', userCtrl.changePassword);

// 2️⃣ Bảo vệ tất cả route còn lại bằng api_auth (xác thực token)
// router.use(api_auth);

// ——— CRUD cho User ———
router.get   ('/users',        userCtrl.getList);
router.get   ('/users/:id',    userCtrl.GetOne);
router.post  ('/users',        userCtrl.Add);
router.put   ('/users/:id',    userCtrl.Edit);
router.delete('/users/:id',    userCtrl.Delete);

// ——— CRUD cho bill ———
router.get   ('/bills',        billCtrl.getList);
router.get   ('/GetAllBills',  billCtrl.GetAllBils);
router.get   ('/bills/:id',    billCtrl.GetOne);
router.post  ('/bills',        billCtrl.Add);
router.put   ('/bills/:id',    billCtrl.Edit);
router.delete('/bills/:id',    billCtrl.Delete);

// ——— CRUD cho Bill Details ———
router.get   ('/billdetails',     billdetails.getList);
router.get   ('/GetAllBillDetails', billdetails.GetAllBillDetail);
router.get   ('/billdetails/:id', billdetails.GetOne);
router.post  ('/billdetails',     billdetails.Add);
router.put   ('/billdetails/:id', billdetails.Edit);
router.delete('/billdetails/:id', billdetails.Delete);

// 3️⃣ Route yêu cầu quyền admin
router.get('/users', userCtrl.getList);
router.get('/users/:id', userCtrl.GetOne);
router.post('/users', requireRole('admin'), userCtrl.Add);
router.put('/users/:id', userCtrl.Edit);
router.delete('/users/:id', requireRole('admin'), userCtrl.Delete);


// Logs
router.get('/logs', requireRole('admin'), logCtrl.getList);
router.get('/logs/:id', requireRole('admin'), logCtrl.GetOne);
router.post('/logs', requireRole('admin'), logCtrl.Add);
router.put('/logs/:id', requireRole('admin'), logCtrl.Edit);
router.delete('/logs/:id', requireRole('admin'), logCtrl.Delete);

// Các route còn lại: user và admin đều được truy cập


// Addresses
router.get   ('/addresses',     addressCtrl.getList);
router.put   ('/set-default/:id',addressCtrl.setDefault);
router.get   ('/GetAllAddress', addressCtrl.GetAllAddress);
router.put   ('/set-default/:id',addressCtrl.setDefault);
router.get   ('/GetAllAddress', addressCtrl.GetAllAddress);
router.get   ('/addresses/:id', addressCtrl.GetOne);
router.post  ('/addresses',     addressCtrl.Add);
router.put   ('/addresses/:id', addressCtrl.Edit);
router.delete('/addresses/:id', addressCtrl.Delete);

// ——— CRUD cho Carts ———
router.get   ('/carts',        cartCtrl.getList);
router.get   ('/GetAllCarts',  cartCtrl.GetAllCart);
router.get   ('/carts/:id',    cartCtrl.GetOne);
router.post  ('/addtocarts',   cartCtrl.Add);
router.put   ('/carts/:id',    cartCtrl.Edit);
router.delete('/carts/:id',    cartCtrl.Delete);
// API xóa toàn bộ giỏ hàng theo user_id
router.delete('/carts/user/:user_id', cartCtrl.DeleteCartByUser);
// Thêm địa chỉ đầu tiên cho user mới
router.post('/addresses/first', addressCtrl.AddFirstAddress);


// Carts
router.get('/carts', cartCtrl.getList);
router.get('/carts/:id', cartCtrl.GetOne);
router.post('/carts', cartCtrl.Add);
router.put('/carts/:id', cartCtrl.Edit);
router.delete('/carts/:id', cartCtrl.Delete);

// Favorites
router.get('/favorites', favoriteCtrl.getList);
router.get('/favorites2', favoriteCtrl.GetFavoriteandNameProduct2);
router.get('/favorites/:id', favoriteCtrl.GetOne);
router.post('/favorites', favoriteCtrl.Add);
router.put('/favorites/:id', favoriteCtrl.Edit);
router.delete('/favorites/:id', favoriteCtrl.Delete);

// Notifications
router.get('/notifications', notificationCtrl.getList);
router.get('/notifications/:id', notificationCtrl.GetOne);
router.post('/notifications', notificationCtrl.Add);
router.put('/notifications/:id', notificationCtrl.Edit);
router.delete('/notifications/:id', notificationCtrl.Delete);

// Vouchers
router.get('/vouchers', voucherCtrl.getList);
router.get('/vouchers/:id', voucherCtrl.GetOne);
router.post('/vouchers', requireRole('admin'), voucherCtrl.Add);
router.put('/vouchers/:id', requireRole('admin'), voucherCtrl.Edit);
router.delete('/vouchers/:id', requireRole('admin'), voucherCtrl.Delete);

// ——— CRUD cho Orders ———
router.get   ('/orders',     orderCtrl.getList);
router.get   ('/GetAllOrders', orderCtrl.GetAllOrder);
router.get   ('/orders/:id', orderCtrl.GetOne);
router.post  ('/orders',     orderCtrl.Add);
router.put   ('/orders/:id', orderCtrl.Edit);
// Orders
router.get('/orders', orderCtrl.getList);
router.get('/orders/:id', orderCtrl.GetOne);
router.post('/orders', orderCtrl.Add);
router.put('/orders/:id', orderCtrl.Edit);
router.delete('/orders/:id', orderCtrl.Delete);

// Order Details
router.get('/orderDetails', orderDetailCtrl.getList);
router.get('/orderDetails/:id', orderDetailCtrl.GetOne);
router.post('/orderDetails', orderDetailCtrl.Add);
router.put('/orderDetails/:id', orderDetailCtrl.Edit);
router.delete('/orderDetails/:id', orderDetailCtrl.Delete);

// Payments
router.get('/payments', paymentCtrl.getList);
router.get('/payments/:id', paymentCtrl.GetOne);
router.post('/payments', paymentCtrl.Add);
router.put('/payments/:id', paymentCtrl.Edit);
router.delete('/payments/:id', paymentCtrl.Delete);

// ——— CRUD cho Reviews ———
router.get   ('/reviews',     reviewCtrl.getList);
router.get   ('/GetAllReview',    reviewCtrl.GetAllReview);
router.get   ('/reviews/:id', reviewCtrl.GetOne);
router.post  ('/reviews',     reviewCtrl.Add);
router.put   ('/reviews/:id', reviewCtrl.Edit);
// Reviews
router.get('/reviews', reviewCtrl.getList);
router.get('/reviews/:id', reviewCtrl.GetOne);
router.post('/reviews', reviewCtrl.Add);
router.put('/reviews/:id', reviewCtrl.Edit);
router.delete('/reviews/:id', reviewCtrl.Delete);

// Ingredients — chỉ cho admin
router.get('/ingredients', requireRole('admin'), ingredientCtrl.getList);
router.get('/ingredients/:id', requireRole('admin'), ingredientCtrl.GetOne);
router.post('/ingredients', requireRole('admin'), ingredientCtrl.Add);
router.put('/ingredients/:id', requireRole('admin'), ingredientCtrl.Edit);
router.delete('/ingredients/:id', requireRole('admin'), ingredientCtrl.Delete);

// Branches — chỉ cho admin
router.get('/branches', requireRole('admin'), branchCtrl.getList);
router.get('/branches/:id', requireRole('admin'), branchCtrl.GetOne);
router.post('/branches', requireRole('admin'), branchCtrl.Add);
router.put('/branches/:id', requireRole('admin'), branchCtrl.Edit);
router.delete('/branches/:id', requireRole('admin'), branchCtrl.Delete);

// Categories — chỉ cho admin
router.get('/categories', categoryCtrl.getList);
router.get('/categories/:id', categoryCtrl.GetOne);
router.post('/categories', requireRole('admin'), categoryCtrl.Add);
router.put('/categories/:id', requireRole('admin'), categoryCtrl.Edit);
router.delete('/categories/:id', requireRole('admin'), categoryCtrl.Delete);

// ——— CRUD cho Products ———
router.get   ('/products',     productCtrl.getList);
router.get   ('/productscategory',     productCtrl.GetListByCategory);
router.get   ('/productsandcategoryid',productCtrl.getProductAndCategoryName);
router.get   ('/productsandintergradianID',productCtrl.getProductAndIngredientName);
router.get   ('/products/:id', productCtrl.GetOne);
router.get   ('/productbyID/:id', productCtrl.getproductbyID);
router.post  ('/products',     productCtrl.Add);
router.put   ('/products/:id', productCtrl.Edit);
router.delete('/products/:id', productCtrl.Delete);
// Products
router.get('/products', productCtrl.getList);
router.get('/productscategory', productCtrl.GetListByCategory);
router.get('/productsandcategoryid', productCtrl.getProductAndCategoryName);
router.get('/productsandintergradianID', productCtrl.getProductAndIngredientName);
router.get('/products/:id', productCtrl.GetOne);
router.post('/products', requireRole('admin'), productCtrl.Add);
router.put('/products/:id', requireRole('admin'), productCtrl.Edit);
router.delete('/products/:id', requireRole('admin'), productCtrl.Delete);

router.get('/products/categories/:id', productCtrl.GetListByCategory);
router.get('/products/search', productCtrl.SearchByName);

// Sizes — chỉ cho admin
router.get('/sizes', sizeCtrl.getList);
router.get('/sizes/:id', sizeCtrl.GetOne);
router.post('/sizes', requireRole('admin'), sizeCtrl.Add);
router.put('/sizes/:id', requireRole('admin'), sizeCtrl.Edit);
router.delete('/sizes/:id', requireRole('admin'), sizeCtrl.Delete);

module.exports = router;
