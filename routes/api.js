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
const paymentCtrl = require('../controllers/api.payment.controller');
const reviewCtrl = require('../controllers/api.review.controller');
const supplierCtrl = require('../controllers/api.supplier.controller');
const categoryCtrl = require('../controllers/api.category.controller');
const productCtrl = require('../controllers/api.product.controller');
const sizeCtrl = require('../controllers/size.controller');
const authCtrl = require('../controllers/api.auth.controller');
const billCtrl = require('../controllers/api.bill.controller');
const billdetails = require('../controllers/api.billdetails.controller');
const voucher_user = require('../controllers/api.voucher_user.controller');
const shipperCtrl = require('../controllers/api.shipper.controller');
const accountCtrl = require('../controllers/api.account.controller');

// 1️⃣ Các route public (không cần token)
router.post('/login', authCtrl.login);
router.post('/register', authCtrl.register);

// Password reset routes (public)
router.post('/send-otp', accountCtrl.sendOTP);             // Gửi OTP reset password
router.post('/verify-otp', accountCtrl.verifyOTP);         // Xác thực OTP (optional)
router.post('/reset-password', accountCtrl.resetPassword); // Reset password với OTP
router.post('/change-password', accountCtrl.changePassword); // Đổi password khi đã login

// 2️⃣ Bảo vệ tất cả route còn lại bằng api_auth (xác thực token)
// Uncomment dòng dưới nếu muốn bảo vệ tất cả routes
// router.use(api_auth);

// ——— CRUD cho User ———
// ✅ ĐẶT CÁC ROUTE CỤ THỂ TRƯỚC CÁC ROUTE DYNAMIC
router.get('/users/with-accounts', userCtrl.getCustomersWithDetails); // Lấy khách hàng với thông tin đầy đủ
router.get('/users/stats', userCtrl.getCustomerStats); // Thống kê khách hàng

router.get('/users', userCtrl.getList);
router.get('/users/account/:account_id', userCtrl.getByAccountId); // ✅ Lấy user bằng account_id
router.get('/users/:id', userCtrl.GetOne); // ✅ Lấy user bằng user_id
router.post('/users/profile', userCtrl.createUserProfile); // ✅ Tạo profile user
router.put('/users/:id', userCtrl.Edit);
router.delete('/users/:id', userCtrl.Delete);

// ✅ Route khóa/mở khóa account CHỈ CHO WEB ADMIN
router.put('/accounts/:id/lock', accountCtrl.lockAccount); // Khóa tài khoản
router.put('/accounts/:id/unlock', accountCtrl.unlockAccount); // Mở khóa tài khoản
router.put('/users/:userId/toggle-lock', userCtrl.toggleCustomerLock); // Khóa/mở khóa tài khoản

// ——— CRUD cho Shipper ———
router.get('/shippers', shipperCtrl.getList);
router.get('/shippers/:id', shipperCtrl.GetOne);
router.get('/shippers/:account_id', shipperCtrl.getShipperByAccountId);
router.post('/shippers', requireRole('admin'), shipperCtrl.createShipper);
router.put('/shippers/:id', upload.single('image'), shipperCtrl.Edit);
router.post('/shippers/updateStatus', shipperCtrl.updateOnlineStatus);
router.delete('/shippers/:id', shipperCtrl.Delete);

// ——— CRUD cho bill ———
router.get('/bills', billCtrl.getList);
router.get('/GetAllBills', billCtrl.GetAllBills);
router.get('/bills/:id', billCtrl.GetOne);
router.post('/bills', billCtrl.Add);
router.put('/bills/:id', billCtrl.Edit);
router.put('/bills/:id/assign-shipper', billCtrl.AssignShipper);
router.post('/bills/StartShipping', billCtrl.StartShipping); // 🔥 THÊM route mới
router.post('/bills/CompleteOrder', billCtrl.CompleteOrder);
router.post('/bills/CancelOrder', billCtrl.CancelOrder);
router.delete('/bills/:id', billCtrl.Delete);

// ——— CRUD cho Bill Details ———
router.get('/billdetails', billdetails.getList);
router.get('/GetAllBillDetails', billdetails.GetAllBillDetail);
router.get('/billdetails/:id', billdetails.GetOne);
router.post('/billdetails', billdetails.Add);
router.put('/billdetails/:id', billdetails.Edit);
router.delete('/billdetails/:id', billdetails.Delete);

// ——— CRUD cho Suppliers ———
router.get('/suppliers', supplierCtrl.getList);
router.get('/suppliers/active', supplierCtrl.getActiveSuppliers); // ✅ Web admin endpoint
router.get('/suppliers/search', supplierCtrl.searchByName); // ✅ Web admin endpoint
router.get('/suppliers/statistics', supplierCtrl.getStatistics); // ✅ Web admin endpoint
router.get('/suppliers/expiring-soon', supplierCtrl.getExpiringSoon); // ✅ Web admin endpoint
router.get('/suppliers/:id', supplierCtrl.GetOne);
router.post('/suppliers', api_auth, requireRole('admin'), supplierCtrl.Add);
router.put('/suppliers/:id', api_auth, requireRole('admin'), supplierCtrl.Edit);
router.delete('/suppliers/:id', api_auth, requireRole('admin'), supplierCtrl.Delete);

// Logs - Admin only
router.get('/logs', requireRole('admin'), logCtrl.getList);
router.get('/logs/:id', requireRole('admin'), logCtrl.GetOne);
router.post('/logs', requireRole('admin'), logCtrl.Add);
router.put('/logs/:id', requireRole('admin'), logCtrl.Edit);
router.delete('/logs/:id', requireRole('admin'), logCtrl.Delete);

// ——— CRUD cho Address ———
router.get('/addresses', addressCtrl.getList); // 🔥 THÊM DÒNG NÀY
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
router.delete('/carts/user/:user_id', cartCtrl.DeleteCartByUser); // API xóa toàn bộ giỏ hàng theo user_id

// ——— CRUD cho Favorites ———
router.get('/favorites', favoriteCtrl.getList);
router.get('/favorites2', favoriteCtrl.GetFavoriteandNameProduct2);
router.get('/favorites/:id', favoriteCtrl.GetOne);
router.post('/favorites', favoriteCtrl.Add);
router.put('/favorites/:id', favoriteCtrl.Edit);
router.delete('/favorites/:id', favoriteCtrl.Delete);

// ——— NOTIFICATIONS - 100% Backward Compatible với Mobile ———

// 🆕 ENDPOINTS MỚI CHỈ CHO WEB ADMIN (đặt TRƯỚC để không bị conflict)
router.get('/notifications/admin/all', api_auth, requireRole('admin'), notificationCtrl.getListForAdmin);
router.get('/notifications/admin/stats', api_auth, requireRole('admin'), notificationCtrl.getStats);
router.post('/notifications/admin/broadcast', api_auth, requireRole('admin'), notificationCtrl.broadcast);
router.put('/notifications/admin/bulk/mark-read', api_auth, requireRole('admin'), notificationCtrl.markReadBulk);
router.delete('/notifications/admin/bulk/delete', api_auth, requireRole('admin'), notificationCtrl.deleteBulk);

// 🔄 GIỮ NGUYÊN 100% endpoints cũ cho mobile app
router.get('/notifications/user/:userId', api_auth, notificationCtrl.getListByUser); // ✅ Mobile app endpoint
router.get('/notifications', api_auth, notificationCtrl.getList); // ✅ Mobile + Web compatible
router.get('/notifications/:id', api_auth, notificationCtrl.GetOne); // ✅ Mobile + Web
router.post('/notifications', notificationCtrl.Add); // ✅ Mobile compatible (no auth required)
router.put('/notifications/:id', api_auth, notificationCtrl.Edit); // ✅ Mobile + Web
router.delete('/notifications/:id', api_auth, notificationCtrl.Delete); // ✅ Web admin only

// ——— CRUD cho Vouchers ———
router.get('/vouchers', voucherCtrl.getList);
router.get('/vouchers/:id', voucherCtrl.GetOne);
router.post('/vouchers', requireRole('admin'), voucherCtrl.Add);
router.put('/vouchers/:id', requireRole('admin'), voucherCtrl.Edit);
router.delete('/vouchers/:id', requireRole('admin'), voucherCtrl.Delete);

// ——— CRUD cho Voucher Users ———
router.get('/getallvoucher_users', voucher_user.GetAllVoucher_user);
router.get('/voucher_users', voucher_user.getList);
router.get('/voucher_users/:id', voucher_user.GetOne);
router.post('/voucher_users', voucher_user.Add);
router.put('/voucher_users/:id', voucher_user.Edit);
router.delete('/voucher_users/:id', voucher_user.Delete);
router.get('/voucher_users/user/:userId', voucher_user.GetVoucherUserByUserId);

// ——— CRUD cho Payments ———
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

// ——— CRUD cho Categories ———
router.get('/categories', categoryCtrl.getList);
router.get('/categories/:id', categoryCtrl.GetOne);
router.post('/categories', requireRole('admin'), categoryCtrl.Add);
router.put('/categories/:id', requireRole('admin'), categoryCtrl.Edit);
router.delete('/categories/:id', requireRole('admin'), categoryCtrl.Delete);

// ——— CRUD cho Products - ENHANCED ———
// ✅ WEB ADMIN SPECIFIC ROUTES (Đặt trước để tránh conflict)
router.get('/products/with-sizes', productCtrl.getProductsWithSizes); // 🆕 Web admin endpoint
router.get('/products/all/with-sizes', productCtrl.getAllProductsWithSizes); // 🆕 Enhanced version
router.post('/products/:id/update-stock', productCtrl.updateStock); // 🆕 Web admin endpoint  
router.post('/products/update-all-stock', productCtrl.updateAllStock); // 🆕 Web admin endpoint

// ✅ MOBILE COMPATIBLE ROUTES (Giữ nguyên thứ tự cũ)
router.get('/products', productCtrl.getList);
router.get('/productscategory', productCtrl.GetListByCategory);
router.get('/productsandcategoryid', productCtrl.getProductAndCategoryName);
router.get('/productsandintergradianID', productCtrl.getProductAndIngredientName);
router.get('/products/categories/:id', productCtrl.GetListByCategory);
router.get('/products/search', productCtrl.SearchByName);

// ✅ INDIVIDUAL PRODUCT ROUTES
router.get('/products/:id/with-sizes', productCtrl.getProductWithSizes); // Enhanced version
router.get('/products/:id', productCtrl.GetOne); // Keep for mobile compatibility
router.post('/products', productCtrl.Add);
router.put('/products/:id', productCtrl.Edit);
router.delete('/products/:id', productCtrl.Delete);

// ——— CRUD cho Sizes (ENHANCED) ———
// ✅ WEB ADMIN ROUTES - đặt trước để tránh conflict  
router.get('/sizes/product/:productId', sizeCtrl.getSizesByProduct); // 🆕 Get sizes by product
router.post('/sizes/bulk-create', sizeCtrl.bulkCreate); // 🆕 Bulk create sizes
router.post('/sizes/bulk-update', sizeCtrl.bulkUpdate); // 🆕 Bulk update sizes
router.delete('/sizes/product/:productId', sizeCtrl.deleteByProduct); // 🆕 Delete all sizes of product

// ✅ STANDARD CRUD ROUTES (Mobile compatible)
router.get('/sizes', sizeCtrl.getList);
router.get('/sizes/:id', sizeCtrl.GetOne);
router.post('/sizes', sizeCtrl.Add); // Enhanced with stock update
router.put('/sizes/:id', sizeCtrl.Edit); // Enhanced with stock update  
router.delete('/sizes/:id', sizeCtrl.Delete); // Enhanced with stock update

module.exports = router;