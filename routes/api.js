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
const ratingCtrl = require('../controllers/api.rating.controller');
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
const messageCtrl = require('../controllers/api.message.controller');
const vnpayRoutes = require('../vnpay/vnpay.routes');
const supplierCtrl = require('../controllers/api.supplier.controller');

//------------------update Fix web admin---------------------
// Web admin - quản lý voucher_user
const voucherUserAdminCtrl = require('../controllers/api.voucherUserAdmin.controller');
//-----------------Kết thúc Fix web admin---------------------

// 1️⃣ Các route public (không cần token)
router.post('/login', authCtrl.login);
router.post('/register', authCtrl.register);

// Password reset routes (public)
router.post('/send-otp', accountCtrl.sendOTP);             // Gửi OTP reset password
router.post('/verify-otp', accountCtrl.verifyOTP);         // Xác thực OTP (optional)
router.post('/reset-password', accountCtrl.resetPassword); // Reset password với OTP
router.post('/change-password', accountCtrl.changePassword); // Đổi password khi đã login
router.get ('/account/:id',    accountCtrl.GetOne);
// 2️⃣ Bảo vệ tất cả route còn lại bằng api_auth (xác thực token)
// Uncomment dòng dưới nếu muốn bảo vệ tất cả routes
// router.use(api_auth);


// ——— CRUD cho Shipper ———
router.get   ('/shippers',        shipperCtrl.getList);
router.get   ('/shippers/:id',    shipperCtrl.GetOne);
//------------------update Fix web admin---------------------
router.get('/shippers/account/:account_id', shipperCtrl.getShipperByAccountId);
router.put('/shippers/:id', shipperCtrl.Edit);
router.post('/shippers/updateStatus', shipperCtrl.updateOnlineStatus);
//-----------------Kết thúc Fix web admin---------------------

//------------------update Fix web admin---------------------
// Tạo shipper thường (web admin) - CẦN AUTH
router.post('/shippers', api_auth, requireRole('admin'), shipperCtrl.createShipper);
// Tạo shipper kèm account (web admin) - không cần ảnh, shipper tự sửa sau
router.post('/shippers/create-with-account', api_auth, requireRole('admin'), shipperCtrl.createShipperWithAccount);
// Xóa shipper yêu cầu admin (giữ an toàn dữ liệu)
router.delete('/shippers/:id', api_auth, requireRole('admin'), shipperCtrl.Delete);
//-----------------Kết thúc Fix web admin---------------------

// ——— CRUD cho Message ———
// routes/message.route.js
router.get('/messages/conversations', messageCtrl.getConversations);
router.get("/messages/:userId", messageCtrl.getMessages);
router.post('/messages', messageCtrl.sendMessage); 


//------------------update Fix web admin---------------------
// ✅ Web admin routes - ĐẶT TRƯỚC để tránh conflict với :id routes
router.get('/users/with-accounts', api_auth, requireRole('admin'), userCtrl.getCustomersWithDetails);
router.get('/users/stats',         api_auth, requireRole('admin'), userCtrl.getCustomerStats);
router.put('/users/:id/toggle-lock', api_auth, requireRole('admin'), userCtrl.toggleCustomerLock);
//-----------------Kết thúc Fix web admin---------------------

// ——— CRUD cho User ———
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

// ✅ THÊM route GET accounts cho web admin
router.get('/accounts', api_auth, requireRole('admin'), accountCtrl.getList);
router.get('/accounts/:id', api_auth, requireRole('admin'), accountCtrl.GetOne);

// ✅ Route khóa/mở khóa account CHỈ CHO WEB ADMIN
router.put('/accounts/:id/lock', api_auth, requireRole('admin'), accountCtrl.lockAccount); // Khóa tài khoản
router.put('/accounts/:id/unlock', api_auth, requireRole('admin'), accountCtrl.unlockAccount); // Mở khóa tài khoản
// ✅ THÊM: Route xóa account (CHỈ CHO WEB ADMIN)
router.delete('/accounts/:id', api_auth, requireRole('admin'), accountCtrl.Delete); // Xóa account

// ——— CRUD cho bill ———
//------------------update Fix web admin---------------------
router.get('/bills/admin/kpi',           api_auth, requireRole('admin'), billCtrl.getAdminKPI);
router.get('/bills/admin/daily-revenue', api_auth, requireRole('admin'), billCtrl.getAdminDailyRevenue);
//-----------------Kết thúc Fix web admin---------------------
router.get   ('/bills',        billCtrl.getList);
//------------------update Fix web admin---------------------
router.get   ('/GetAllBills',  billCtrl.GetAllBillsSimple); // 📱 MOBILE COMPATIBILITY - Sử dụng function đơn giản
router.get   ('/bills/enhanced', billCtrl.GetAllBills); // 🌐 WEB ADMIN - Function mới có enrich
//-----------------Kết thúc Fix web admin---------------------
router.get   ('/bills/:id',    billCtrl.GetOne);
router.post  ('/bills',        billCtrl.Add);
router.put   ('/bills/:id',    billCtrl.Edit);
router.delete('/bills/:id',    billCtrl.Delete);
router.put   ('/bills/:id/assign-shipper', billCtrl.AssignShipper);
router.post  ('/bills/CompleteOrder',      billCtrl.CompleteOrder);
router.post  ('/bills/CancelOrder',        billCtrl.CancelOrder);
router.post  ('/bills/cancel-by-customer', billCtrl.CancelOrderByCustomer); // ✅ Khách hàng hủy đơn
//------------------update Fix web admin---------------------
router.post  ('/bills/process-refund',     billCtrl.ProcessRefund); // ✅ Admin xử lý hoàn tiền VNPay
router.post  ('/bills/process-refund-management', billCtrl.ProcessRefundManagement); // 🔥 THÊM: API riêng cho RefundManagement JSX
router.post  ('/payments/vnpay/refund',    require('../vnpay/vnpay.controller').processRefund); // 🔥 API hoàn tiền VNPay
router.post  ('/payments/vnpay/query',     require('../vnpay/vnpay.controller').queryTransaction); // 🔥 API truy vấn VNPay
//-----------------Kết thúc Fix web admin---------------------
router.post  ('/bills/CreatePending',      billCtrl.CreatePendingBill); // COD only
router.post  ('/bills/CreateAfterPayment', billCtrl.CreateBillAfterPayment); // ✅ Sau thanh toán online


// ——— CRUD cho Bill Details ———
router.get('/billdetails', billdetails.getList);
router.get('/billdetails/by-bill/:bill_id', billdetails.GetBillDetailsByBillId);
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
// API xóa toàn bộ giỏ hàng theo user_id
router.delete('/carts/account/:accountId', cartCtrl.DeleteCartByAccount);
// Thêm API lấy giỏ hàng theo user hiện tại
router.get('/GetCartByAccount/:accountId', cartCtrl.GetCartByAccount);

// ——— CRUD cho Favorites ———
router.get('/favorites', favoriteCtrl.getList);
router.get('/favorites/account/:accountId', favoriteCtrl.GetFavoriteandNameProduct);
router.get('/favorites2', favoriteCtrl.GetFavoriteandNameProduct2);
router.get('/favorites/:id', favoriteCtrl.GetOne);
router.post('/favorites', favoriteCtrl.Add);
router.put('/favorites/:id', favoriteCtrl.Edit);
router.delete('/favorites/:id', favoriteCtrl.Delete);

// Notifications - Sắp xếp routes cụ thể trước
//------------------update Fix web admin---------------------
// Web admin - endpoints riêng (không ảnh hưởng mobile)
router.get('/notifications/admin/all', api_auth, requireRole('admin'), notificationCtrl.getListForAdmin);
router.get('/notifications/admin/stats', api_auth, requireRole('admin'), notificationCtrl.getStats);
router.post('/notifications/admin/broadcast', api_auth, requireRole('admin'), notificationCtrl.broadcast);
router.put('/notifications/admin/mark-read-bulk', api_auth, requireRole('admin'), notificationCtrl.markReadBulk);
router.put('/notifications/admin/bulk/mark-read', api_auth, requireRole('admin'), notificationCtrl.markReadBulk);
router.delete('/notifications/admin/bulk/delete', api_auth, requireRole('admin'), notificationCtrl.bulkDelete);
//-----------------Kết thúc Fix web admin---------------------

router.get('/notifications', notificationCtrl.getList);
router.get('/notifications/user/:userId', notificationCtrl.getListByUser);
router.get('/notifications/unread-count/:userId', notificationCtrl.getUnreadCount);
router.put('/notifications/mark-all-read/:userId', notificationCtrl.markAllAsRead);
router.delete('/notifications/delete-all-read/:userId', notificationCtrl.deleteAllRead);
router.get('/notifications/:id', notificationCtrl.GetOne);
router.post('/notifications', notificationCtrl.Add);
//------------------update Fix web admin---------------------
router.put('/notifications/:id/mark-read', api_auth, notificationCtrl.markAsRead); // Thêm auth để có thông tin user
//-----------------Kết thúc Fix web admin---------------------
//------------------update Fix web admin---------------------
router.put('/notifications/:id', api_auth, notificationCtrl.Edit); // Thêm auth để có thông tin user
//-----------------Kết thúc Fix web admin---------------------
//------------------update Fix web admin---------------------
router.delete('/notifications/:id', api_auth, notificationCtrl.deleteNotification); // Thêm auth để có thông tin user
//-----------------Kết thúc Fix web admin---------------------

// 🔄 GIỮ NGUYÊN 100% endpoints cũ cho mobile app
router.get('/notifications/user/:userId', api_auth, notificationCtrl.getListByUser); // ✅ Mobile app endpoint
router.get('/notifications', api_auth, notificationCtrl.getList); // ✅ Mobile + Web compatible
router.get('/notifications/:id', api_auth, notificationCtrl.GetOne); // ✅ Mobile + Web
router.post('/notifications', notificationCtrl.Add); // ✅ Mobile compatible (no auth required)
router.put('/notifications/:id', api_auth, notificationCtrl.Edit); // ✅ Mobile + Web
router.delete('/notifications/:id', api_auth, notificationCtrl.Delete); // ✅ Web admin only

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
// API đánh dấu voucher đang sử dụng (available -> in_use)
router.post('/voucher_users/mark-in-use', voucher_user.MarkVoucherInUse);
// ❌ API đánh dấu voucher đã sử dụng - KHÔNG CẦN THIẾT NỮA (chỉ có 2 status)
// router.post('/voucher_users/mark-used', voucher_user.MarkVoucherAsUsed);
// API cập nhật trạng thái voucher hết hạn tự động
router.post('/voucher_users/update-expired', voucher_user.UpdateExpiredVouchers);

//------------------update Fix web admin---------------------
// ✅ CRUD cho Vouchers - THIẾU ROUTES CHO WEB ADMIN
router.get('/vouchers', voucherCtrl.getList);
router.get('/vouchers/:id', voucherCtrl.GetOne);
router.post('/vouchers', api_auth, requireRole('admin'), voucherCtrl.Add);
router.put('/vouchers/:id', api_auth, requireRole('admin'), voucherCtrl.Edit);
router.delete('/vouchers/:id', api_auth, requireRole('admin'), voucherCtrl.Delete);

// Web admin - quản lý voucher_user
router.get   ('/admin/voucher_users',        api_auth, requireRole('admin'), voucherUserAdminCtrl.adminList);
router.put   ('/admin/voucher_users/:id',    api_auth, requireRole('admin'), voucherUserAdminCtrl.updateStatus);
router.delete('/admin/voucher_users/:id',    api_auth, requireRole('admin'), voucherUserAdminCtrl.remove);
//-----------------Kết thúc Fix web admin---------------------

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

// Categories — chỉ cho admin
router.get('/categories', categoryCtrl.getList);
router.get('/categories/:id', categoryCtrl.GetOne);
router.post('/categories', requireRole('admin'), categoryCtrl.Add);
router.put('/categories/:id', requireRole('admin'), categoryCtrl.Edit);
router.delete('/categories/:id', requireRole('admin'), categoryCtrl.Delete);

// ——— CRUD cho Products - ENHANCED ———
//------------------update Fix Product routes - sửa lỗi tên function---------------------
// ✅ WEB ADMIN SPECIFIC ROUTES (Đặt trước để tránh conflict)
router.get('/products/with-sizes', productCtrl.getProductsWithSizes); // 🆕 Web admin endpoint
router.get('/products/all/with-sizes', productCtrl.getProductsWithSizes); // 🔥 FIX: đổi tên function đúng
router.post('/products/:id/update-stock', productCtrl.updateStock); // 🆕 Web admin endpoint  
router.post('/products/update-all-stock', productCtrl.updateAllStock); // 🆕 Web admin endpoint
//-----------------Kết thúc Fix Product routes - sửa lỗi tên function---------------------

// ✅ MOBILE COMPATIBLE ROUTES (Giữ nguyên thứ tự cũ)
router.get('/products', productCtrl.getList);
router.get('/productscategory', productCtrl.GetListByCategory);
router.get('/productsandcategoryid', productCtrl.getProductAndCategoryName);
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
//------------------update Fix web admin---------------------
router.post('/sizes/bulk-create', api_auth, requireRole('admin'), sizeCtrl.bulkCreate); // 🆕 Bulk create sizes
router.post('/sizes/bulk-update', api_auth, requireRole('admin'), sizeCtrl.bulkUpdate); // 🆕 Bulk update sizes
router.delete('/sizes/product/:productId', api_auth, requireRole('admin'), sizeCtrl.deleteByProduct); // 🆕 Delete all sizes of product
//-----------------Kết thúc Fix web admin---------------------

// ✅ STANDARD CRUD ROUTES (Mobile compatible)
router.get('/sizes', sizeCtrl.getList);
router.post('/decrease-quantity', sizeCtrl.DecreaseQuantity); // ✅ Đổi lại thành sizeCtrl
router.get('/sizes/:id', sizeCtrl.GetOne);
//------------------update Fix web admin---------------------
router.post('/sizes', api_auth, requireRole('admin'), sizeCtrl.Add);
router.put('/sizes/:id', api_auth, requireRole('admin'), sizeCtrl.Edit);
router.delete('/sizes/:id', api_auth, requireRole('admin'), sizeCtrl.Delete);
//-----------------Kết thúc Fix web admin---------------------

//vnpay routes
router.use('/vnpay', vnpayRoutes);


module.exports = router;