const express = require('express');
const router = express.Router();
const upload = require('../middleware/api.upload');
const { api_auth, requireRole } = require('../middleware/api.auth');
 

// Controllers
const userCtrl = require('../controllers/api.user.controller');
const addressCtrl = require('../controllers/api.address.controller');
const cartCtrl = require('../controllers/api.cart.controller');
const favoriteCtrl = require('../controllers/api.favorite.controller');
const notificationCtrl = require('../controllers/api.notification.controller');
const logCtrl = require('../controllers/api.log.controller');
const voucherCtrl = require('../controllers/api.voucher.controller');
const orderCtrl = require('../controllers/api.order.controller');
const orderDetailCtrl = require('../controllers/api.orderDetail.controller');
const paymentCtrl = require('../controllers/api.payment.controller');
const reviewCtrl = require('../controllers/api.review.controller');
const ratingCtrl = require('../controllers/api.rating.controller');
const ingredientCtrl = require('../controllers/api.ingredient.controller');
const branchCtrl = require('../controllers/api.branch.controller');
const categoryCtrl = require('../controllers/api.category.controller');
const productCtrl = require('../controllers/api.product.controller');
const sizeCtrl = require('../controllers/size.controller');
const authCtrl = require('../controllers/api.auth.controller');
const billCtrl = require('../controllers/api.bill.controller');
const billdetails = require('../controllers/api.billdetails.controller');
const voucher_user = require('../controllers/api.voucher_user.controller');
const shipperCtrl        = require('../controllers/api.shipper.controller');
const accountCtrl = require('../controllers/api.account.controller');
const aiCtrl = require('../controllers/api.ai.controller');

// 1️⃣ Các route public (không cần token)
router.post('/login', authCtrl.login);
router.post('/register', authCtrl.register);

// 2️⃣ Tất cả các route phía dưới đây đều bảo vệ bằng middleware api_auth
// router.use(mdw.api_auth);
router.post('/send-otp', accountCtrl.sendOTP);             // Gửi OTP reset password
router.post('/verify-otp', accountCtrl.verifyOTP);         // Xác thực OTP (optional)
router.post('/reset-password', accountCtrl.resetPassword); // Reset password với OTP
router.post('/change-password', accountCtrl.changePassword); // Đổi password khi đã login
router.get ('/account/:id',    accountCtrl.GetOne);
// 2️⃣ Bảo vệ tất cả route còn lại bằng api_auth (xác thực token)
// router.use(api_auth);


// ——— CRUD cho Shipper ———
router.get   ('/shippers',        shipperCtrl.getList);
router.get   ('/shippers/:id',    shipperCtrl.GetOne);
router.get('/shippers/:account_id', shipperCtrl.getShipperByAccountId);
router.post('/shippers', requireRole('admin'), shipperCtrl.createShipper);
router.put('/shippers/:id', shipperCtrl.Edit);
router.post('/shippers/updateStatus', shipperCtrl.updateOnlineStatus);
router.delete('/shippers/:id',    shipperCtrl.Delete);


// ——— CRUD cho User ———router.get('/users/:id', userCtrl.GetOne);
router.get('/users', userCtrl.getList);
router.get('/users/account/:account_id', userCtrl.getByAccountId); // ✅ Lấy user bằng account_id
router.get('/users/:id', userCtrl.GetOne); // ✅ Lấy user bằng user_id
router.post('/users/profile', userCtrl.createUserProfile); // ✅ Tạo profile user
router.put('/users/:id', userCtrl.Edit);
router.delete('/users/:id', userCtrl.Delete);

// ——— AI Chat Routes ———
router.post('/ai/chat', aiCtrl.chat);
router.get('/ai/suggestions', aiCtrl.getQuickSuggestions);
router.get('/ai/product/:product_id', aiCtrl.getProductInfo);

// --- CRUD cho Shippers
router.post('/shippers', requireRole('admin'), shipperCtrl.createShipper);


// ——— CRUD cho bill ———
router.get   ('/bills',        billCtrl.getList);
router.get   ('/GetAllBills',  billCtrl.GetAllBills); // tên viết hoa có thể đổi thành /bills/all cho chuẩn REST
router.get   ('/bills/:id',    billCtrl.GetOne);
router.post  ('/bills',        billCtrl.Add);
router.put   ('/bills/:id',    billCtrl.Edit);
router.delete('/bills/:id',    billCtrl.Delete);
router.put   ('/bills/:id/assign-shipper', billCtrl.AssignShipper);
router.post  ('/bills/CompleteOrder',      billCtrl.CompleteOrder);
router.post  ('/bills/CancelOrder',        billCtrl.CancelOrder);
router.post  ('/bills/CreatePending',      billCtrl.CreatePendingBill); // đổi path cho thống nhất


// ——— CRUD cho Bill Details ———
router.get('/billdetails', billdetails.getList);
router.get('/billdetails/by-bill/:bill_id', billdetails.GetBillDetailsByBillId);
router.get('/GetAllBillDetails', billdetails.GetAllBillDetail);
router.get('/billdetails/:id', billdetails.GetOne);
router.post('/billdetails', billdetails.Add);
router.put('/billdetails/:id', billdetails.Edit);
router.delete('/billdetails/:id', billdetails.Delete);



// Logs
router.get('/logs', requireRole('admin'), logCtrl.getList);
router.get('/logs/:id', requireRole('admin'), logCtrl.GetOne);
router.post('/logs', requireRole('admin'), logCtrl.Add);
router.put('/logs/:id', requireRole('admin'), logCtrl.Edit);
router.delete('/logs/:id', requireRole('admin'), logCtrl.Delete);

// Các route còn lại: user và admin đều được truy cập


// Trong routes/address.js
router.post('/addresses/first', addressCtrl.createFirstAddress);
router.post('/addresses', addressCtrl.createAddress);
router.put('/addresses/:id', addressCtrl.updateAddress);
router.delete('/addresses/:id', addressCtrl.deleteAddress);
router.get('/addresses/user/:userId', addressCtrl.getAddressByUserId);
router.get('/addresses/default/:userId', addressCtrl.getDefaultAddress);
router.put('/set-default/:id', addressCtrl.setDefault);
router.get('/GetAllAddress', addressCtrl.GetAllAddress);


// ——— CRUD cho Carts ———
router.get('/carts', cartCtrl.getList);
router.get('/GetAllCarts', cartCtrl.GetAllCart);
router.get('/carts/:id', cartCtrl.GetOne);
router.post('/addtocarts', cartCtrl.Add);
router.put('/carts/:id', cartCtrl.Edit);
router.delete('/carts/:id', cartCtrl.Delete);
// API xóa toàn bộ giỏ hàng theo user_id
router.delete('/carts/account/:accountId', cartCtrl.DeleteCartByAccount);



// Favorites
router.get('/favorites', favoriteCtrl.getList);
router.get('/favorites/account/:accountId', favoriteCtrl.GetFavoriteandNameProduct);
router.get('/favorites2', favoriteCtrl.GetFavoriteandNameProduct2);
router.get('/favorites/:id', favoriteCtrl.GetOne);
router.post('/favorites', favoriteCtrl.Add);
router.put('/favorites/:id', favoriteCtrl.Edit);
router.delete('/favorites/:id', favoriteCtrl.Delete);

// Notifications
router.get('/notifications', notificationCtrl.getList);
router.get('/notifications/:id', notificationCtrl.GetOne);
router.get('/notifications/user/:userId', notificationCtrl.getListByUser);
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
router.get('/voucher_users/account/:accountId', voucher_user.GetVoucherUserByAccountId);
// API lưu voucher với kiểm tra trùng lặp
router.post('/voucher_users/save', voucher_user.SaveVoucherToUser);
// API sử dụng voucher với logic kiểm tra đầy đủ
router.post('/voucher_users/use', voucher_user.UseVoucher);
// API đánh dấu voucher đã sử dụng khi đơn hàng thành công
router.post('/voucher_users/mark-used', voucher_user.MarkVoucherAsUsed);
// API cập nhật trạng thái voucher hết hạn tự động
router.post('/voucher_users/update-expired', voucher_user.UpdateExpiredVouchers);






// ——— CRUD cho Orders ———
router.get   ('/orders',     orderCtrl.getList);
// router.get   ('/GetAllOrders', orderCtrl.GetAllOrder);
router.get   ('/orders/:id', orderCtrl.GetOne);
router.post  ('/orders',     orderCtrl.Add);
router.put   ('/orders/:id', orderCtrl.Edit);
router.get('/orders', orderCtrl.getList);
router.get('/orders/:id', orderCtrl.GetOne);
router.post('/orders', orderCtrl.Add);
router.put('/orders/:id', orderCtrl.Edit);
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
router.get('/reviews', reviewCtrl.getList);
router.get('/GetAllReview', reviewCtrl.GetAllReview);
router.get('/reviews/:id', reviewCtrl.GetOne);
router.post('/reviews', reviewCtrl.Add);
router.put('/reviews/:id', reviewCtrl.Edit);
router.delete('/reviews/:id', reviewCtrl.Delete);

// ——— Review Status APIs ———
router.get('/bill-review-status/:billId/:accountId', reviewCtrl.checkBillReviewStatus);
router.get('/product-review-status/:billId/:productId/:accountId', reviewCtrl.checkProductReviewInBill);
router.get('/debug-bill/:billId', reviewCtrl.debugBillDetails);

// ——— Rating APIs (Optimized) ———
router.post('/batch-ratings', ratingCtrl.getBatchRatings);
router.get('/product-rating/:productId', ratingCtrl.getProductRating);

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
router.get('/products', productCtrl.getList);
router.get('/productscategory', productCtrl.GetListByCategory);
router.get('/productsandcategoryid', productCtrl.getProductAndCategoryName);
router.get('/productsandintergradianID', productCtrl.getProductAndIngredientName);
router.get('/products/:id', productCtrl.GetOne);
router.get('/productbyID/:id', productCtrl.getproductbyID);
router.post('/products', productCtrl.Add);
router.put('/products/:id', productCtrl.Edit);
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
router.post('/decrease-quantity', sizeCtrl.DecreaseQuantity);
router.get('/sizes/:id', sizeCtrl.GetOne);
router.post('/sizes', requireRole('admin'), sizeCtrl.Add);
router.put('/sizes/:id', requireRole('admin'), sizeCtrl.Edit);
router.delete('/sizes/:id', requireRole('admin'), sizeCtrl.Delete);

module.exports = router;