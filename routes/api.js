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
const paymentCtrl        = require('../controllers/api.payment.controller');
const reviewCtrl         = require('../controllers/api.review.controller');
const ingredientCtrl     = require('../controllers/api.ingredient.controller');
const branchCtrl         = require('../controllers/api.branch.controller');
const categoryCtrl       = require('../controllers/api.category.controller');
const productCtrl        = require('../controllers/api.product.controller');
const sizeCtrl           = require('../controllers/size.controller');
const authCtrl           = require('../controllers/api.auth.controller');
const billCtrl           = require('../controllers/api.bill.controller');
const billdetails    = require('../controllers/api.billdetails.controller');
const voucher_user = require('../controllers/api.voucher_user.controller');
const billDetailCtrl     = require('../controllers/api.billdetails.controller');
const refundCtrl         = require('../controllers/api.refundRequest.controller');
const shipmentCtrl       = require('../controllers/api.shipment.controller');

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

// Protect all subsequent routes with api_auth
router.use(api_auth);

// Users
router.get('/users', userCtrl.getList);
router.get('/users/:id', userCtrl.GetOne);
router.post('/users', requireRole('admin'), userCtrl.Add);
router.put('/users/:id', userCtrl.Edit);
router.delete('/users/:id', requireRole('admin'), userCtrl.Delete);

// Bills
router.get('/bills', billCtrl.getList);
router.get('/GetAllBills', billCtrl.GetAllBills);
router.get('/bills/:id', billCtrl.GetOne);
router.post('/bills', billCtrl.Add);
router.put('/bills/:id', billCtrl.Edit);
router.delete('/bills/:id', billCtrl.Delete);

// Bill Details
router.get('/billdetails', billDetailCtrl.getList);
router.get('/GetAllBillDetails', billDetailCtrl.GetAllBillDetail);
router.get('/billdetails/:id', billDetailCtrl.GetOne);
router.post('/billdetails', billDetailCtrl.Add);
router.put('/billdetails/:id', billDetailCtrl.Edit);
router.delete('/billdetails/:id', billDetailCtrl.Delete);


// Refund requests
router.get('/refund_requests', refundCtrl.GetList);
router.put('/refund_requests/:id', refundCtrl.Edit);

// Shipments
router.get('/shipments', shipmentCtrl.getList);
router.post('/shipments', shipmentCtrl.Add);
router.put('/shipments/:id', shipmentCtrl.Edit);
router.delete('/shipments/:id', shipmentCtrl.Delete);

// Addresses
router.get('/addresses', addressCtrl.getList);
router.get('/addresses/:id', addressCtrl.GetOne);
router.post('/addresses', addressCtrl.Add);
router.put('/addresses/:id', addressCtrl.Edit);
router.delete('/addresses/:id', addressCtrl.Delete);
router.put('/addresses/:id/set-default', addressCtrl.setDefault);
router.get('/GetAllAddress', addressCtrl.GetAllAddress);

// Carts
router.get('/carts', cartCtrl.getList);
router.get('/GetAllCarts', cartCtrl.GetAllCart);
router.get('/carts/:id', cartCtrl.GetOne);
router.post('/carts', cartCtrl.Add);
router.put('/carts/:id', cartCtrl.Edit);
router.delete('/carts/:id', cartCtrl.Delete);
router.delete('/carts/user/:user_id', cartCtrl.DeleteCartByUser);
router.post('/addresses/first', addressCtrl.AddFirstAddress);

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

// Voucher Users
router.get('/getallvoucher_users', voucher_user.GetAllVoucher_user);
router.get('/voucher_users', voucher_user.getList);
router.get('/voucher_users/:id', voucher_user.GetOne);
router.post('/voucher_users', voucher_user.Add);
router.put('/voucher_users/:id', voucher_user.Edit);
router.delete('/voucher_users/:id', voucher_user.Delete);
router.get('/voucher_users/user/:userId', voucher_user.GetVoucherUserByUserId);




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

// Reviews
router.get('/reviews', reviewCtrl.getList);
router.get('/GetAllReview', reviewCtrl.GetAllReview);
router.get('/reviews/:id', reviewCtrl.GetOne);
router.post('/reviews', reviewCtrl.Add);
router.put('/reviews/:id', reviewCtrl.Edit);
router.delete('/reviews/:id', reviewCtrl.Delete);

// Ingredients — chỉ cho admin
router.get('/ingredients', ingredientCtrl.getList);
router.get('/ingredients/:id', ingredientCtrl.GetOne);
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
