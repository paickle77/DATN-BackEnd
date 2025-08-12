// controllers/api.bill.controller.js - 🔥 FIXED VERSION
const Base       = require('./base.controller');
const Bill       = require('../models/bill.model');
const User       = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');
const Address = require('../models/address.model');
const Shipper = require('../models/shipper.model');

const controller = Base(Bill);

// 🔥 FIXED: GetAllBills với populate user thông qua account_id
controller.GetAllBills = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || '-created_at';

        // 🔥 STEP 1: Lấy tất cả bills
        const bills = await Bill.find()
            .select('user_id account_id address_id shipper_id status total created_at voucher_code')
            .populate('address_id')
            .populate('shipper_id', 'full_name name phone is_online')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        let responseData = bills;

        if (enrich) {
            // 🔥 STEP 2: Lấy thông tin user cho từng bill
            const enrichedBills = await Promise.all(bills.map(async (bill) => {
                let customerName = 'Khách hàng không rõ';
                let customerPhone = '';
                
                try {
                    let user = null;
                    
                    // Try 1: Tìm user qua user_id trực tiếp (nếu có)
                    if (bill.user_id) {
                        user = await User.findById(bill.user_id).select('name phone').lean();
                    }
                    
                    // Try 2: Tìm user qua account_id hoặc Account_id (handle cả 2 case)
                    if (!user && (bill.account_id || bill.Account_id)) {
                        const accountId = bill.account_id || bill.Account_id;
                        user = await User.findOne({ account_id: accountId }).select('name phone').lean();
                    }
                    
                    // Try 3: Tìm tất cả users và match với account từ bill
                    if (!user) {
                        const allUsers = await User.find().select('name phone account_id').lean();
                        // Có thể cần logic phức tạp hơn tùy vào cách bạn liên kết bill với user
                        console.log('⚠️ Cannot find user for bill:', bill._id);
                    }
                    
                    if (user) {
                        customerName = user.name || 'Khách hàng không rõ';
                        customerPhone = user.phone || '';
                    }
                    
                } catch (userErr) {
                    console.error('❌ Error finding user for bill:', bill._id, userErr.message);
                }

                return {
                    ...bill,
                    customerName,
                    customerPhone,
                    shipperName: (bill.status === 'shipping' || bill.status === 'done') && bill.shipper_id ? 
                                 (bill.shipper_id.full_name || bill.shipper_id.name || 'Shipper không rõ') : 
                                 (bill.status === 'ready' && bill.shipper_id ? 'Đã gán shipper' : '—'),
                    addressString: formatAddress(bill.address_id),
                    voucherDisplayCode: bill.voucher_code || '—',
                    statusDisplay: getStatusDisplay(bill.status),
                    created_date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : '',
                    total_formatted: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bill.total || 0)
                };
            }));

            responseData = enrichedBills;
        }

        res.json({ 
            success: true, 
            msg: 'OK', 
            data: responseData, 
            total: await Bill.countDocuments(),
            debug: enrich ? {
                message: 'Bills enriched with user lookup',
                sampleBill: responseData[0] ? {
                    id: responseData[0]._id,
                    customerName: responseData[0].customerName,
                    hasUserInfo: !!(responseData[0].customerName !== 'Khách hàng không rõ')
                } : null
            } : undefined
        });
    } catch (err) {
        console.error('❌ GetAllBills Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy danh sách hóa đơn: ' + err.message });
    }
};

// 🔥 FIXED: GetOne với user lookup
controller.GetOne = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';

        const bill = await Bill.findById(req.params.id)
            .populate('address_id')
            .populate('shipper_id', 'full_name name phone is_online')
            .lean();

        if (!bill) {
            return res.status(404).json({ success: false, msg: 'Hóa đơn không tồn tại' });
        }

        // 🔥 MANUAL USER LOOKUP
        let customerName = 'Khách hàng không rõ';
        let customerPhone = '';
        
        try {
            let user = null;
            
            if (bill.user_id) {
                user = await User.findById(bill.user_id).select('name phone').lean();
            } else if (bill.account_id || bill.Account_id) {
                const accountId = bill.account_id || bill.Account_id;
                user = await User.findOne({ account_id: accountId }).select('name phone').lean();
            }
            
            if (user) {
                customerName = user.name || 'Khách hàng không rõ';
                customerPhone = user.phone || '';
            }
        } catch (userErr) {
            console.error('❌ Error finding user:', userErr);
        }

        // Fetch items
        const details = await BillDetail.find({ bill_id: req.params.id })
            .populate('product_id', 'name price')
            .lean();
        const items = details.map(d => ({
            product_id: d.product_id?._id || d.product_id,
            productName: d.product_id?.name || 'Sản phẩm không tồn tại',
            quantity: d.quantity || 0,
            unitPrice: d.price || 0,
            size: d.size || '',
            total: d.total || (d.quantity * d.price) || 0
        }));

        let responseData = { ...bill, items, customerName, customerPhone };

        if (enrich) {
            responseData = {
                ...responseData,
                shipperName: bill.shipper_id?.full_name || bill.shipper_id?.name || (bill.shipper_id ? 'Shipper không rõ' : '—'),
                shipperPhone: bill.shipper_id?.phone || '',
                addressString: formatAddress(bill.address_id),
                voucherDisplayCode: bill.voucher_code || '—',
                statusDisplay: getStatusDisplay(bill.status),
                created_date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : '',
                total_formatted: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bill.total || 0)
            };
        }

        res.json({ success: true, msg: 'OK', data: responseData });
    } catch (err) {
        console.error('❌ GetOne Bill Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy chi tiết hóa đơn: ' + err.message });
    }
};

// 🔥 THÊM: DEBUG API để kiểm tra dữ liệu
controller.DebugBillData = async (req, res) => {
    try {
        const bills = await Bill.find().limit(3).lean();
        const users = await User.find().limit(5).lean();
        const accounts = await Account.find().limit(5).lean();
        
        console.log('📊 DEBUG DATA:');
        console.log('Bills sample:', bills.map(b => ({ 
            id: b._id, 
            user_id: b.user_id, 
            account_id: b.account_id 
        })));
        console.log('Users sample:', users.map(u => ({ 
            id: u._id, 
            name: u.name, 
            account_id: u.account_id 
        })));
        console.log('Accounts sample:', accounts.map(a => ({ 
            id: a._id, 
            email: a.email 
        })));
        
        res.json({
            success: true,
            debug: {
                bills: bills.length,
                users: users.length,
                accounts: accounts.length,
                billSample: bills[0],
                userSample: users[0],
                relationshipIssue: 'Bills có user_id/account_id không? Users có account_id không?'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Helper functions (giữ nguyên)
function formatAddress(addressInfo) {
    if (!addressInfo) return 'Chưa có địa chỉ giao hàng';
    
    if (typeof addressInfo === 'object') {
        const parts = [
            addressInfo.detail_address || addressInfo.address || addressInfo.street,
            addressInfo.ward || addressInfo.ward_name,
            addressInfo.district || addressInfo.district_name,
            addressInfo.city || addressInfo.province || addressInfo.province_name
        ].filter(Boolean);
        
        if (parts.length > 0) {
            return parts.join(', ');
        }
    }
    
    if (typeof addressInfo === 'string') {
        return addressInfo;
    }
    
    return 'Địa chỉ không đầy đủ';
}

function getStatusDisplay(status) {
    const statusMap = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'ready': 'Sẵn sàng giao',
        'shipping': 'Đang giao',
        'done': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'failed': 'Thất bại'
    };
    
    return statusMap[status] || status;
}

// 🔥 SỬA: PUT /bills/:id/assign-shipper — Gán shipper với logic cập nhật trạng thái
controller.AssignShipper = async (req, res) => {
    try {
        const { shipper_id } = req.body;
        const { id } = req.params;

        if (!shipper_id) {
            return res.status(400).json({ 
                success: false,
                msg: 'Thiếu shipper_id' 
            });
        }

        // Kiểm tra đơn hàng tồn tại
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({ 
                success: false,
                msg: 'Không tìm thấy đơn hàng' 
            });
        }

        // Kiểm tra shipper có tồn tại không
        const shipper = await Shipper.findById(shipper_id);
        if (!shipper) {
            return res.status(404).json({ 
                success: false,
                msg: 'Không tìm thấy shipper' 
            });
        }

        // Kiểm tra đơn đã có shipper chưa
        if (bill.shipper_id) {
            return res.status(400).json({ 
                success: false,
                msg: 'Đơn hàng đã có shipper' 
            });
        }

        // Kiểm tra trạng thái đơn hàng
        if (bill.status !== 'confirmed' && bill.status !== 'ready') {
            return res.status(400).json({ 
                success: false,
                msg: 'Đơn hàng phải ở trạng thái "confirmed" hoặc "ready" để gán shipper' 
            });
        }

        // Cập nhật đơn hàng
        bill.shipper_id = shipper_id;
        bill.status = 'ready'; // Đặt trạng thái "sẵn sàng giao"
        await bill.save();

        // Lấy thông tin shipper để trả về
        const updatedBill = await Bill.findById(id).lean();
        const shipperInfo = await Shipper.findById(shipper_id).lean();

        res.json({ 
            success: true,
            msg: 'Gán shipper thành công', 
            data: {
                ...updatedBill,
                shipperName: shipperInfo.full_name || shipperInfo.name || 'Shipper không rõ',
                shipperPhone: shipperInfo.phone || ''
            }
        });
    } catch (err) {
        console.error('❌ AssignShipper Error:', err);
        res.status(500).json({ 
            success: false,
            msg: 'Lỗi khi gán shipper: ' + err.message 
        });
    }
};

// 🔥 SỬA: CompleteOrder với logic cập nhật đầy đủ
controller.CompleteOrder = async (req, res) => {
    try {
        const { orderId, shipperId } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là người giao đơn hàng này' 
            });
        }

        if (bill.status === 'done') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng đã được hoàn thành trước đó' 
            });
        }

        if (bill.status !== 'shipping') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng phải ở trạng thái "shipping" để hoàn thành' 
            });
        }

        // Cập nhật trạng thái
        bill.status = 'done';
        bill.delivered_at = new Date();
        await bill.save();

        // Lấy thông tin shipper để trả về
        const shipperInfo = await Shipper.findById(shipperId).lean();

        res.json({ 
            success: true, 
            message: 'Hoàn thành đơn hàng thành công', 
            data: {
                ...bill.toObject(),
                shipperName: shipperInfo?.full_name || shipperInfo?.name || 'Shipper không rõ'
            }
        });
    } catch (error) {
        console.error('❌ CompleteOrder error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server: ' + error.message 
        });
    }
};

// 🔥 SỬA: CancelOrder với logic cập nhật đầy đủ
controller.CancelOrder = async (req, res) => {
    try {
        const { orderId, shipperId } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là shipper của đơn hàng này' 
            });
        }

        if (bill.status === 'done') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng đã hoàn thành, không thể hủy' 
            });
        }

        // Cập nhật trạng thái
        bill.status = 'cancelled';
        bill.cancelled_at = new Date();
        await bill.save();

        res.json({ 
            success: true, 
            message: 'Đơn hàng đã được hủy thành công', 
            data: bill 
        });
    } catch (error) {
        console.error('❌ CancelOrder error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server: ' + error.message 
        });
    }
};

// 🔥 THÊM: API chuyển đơn hàng sang trạng thái "đang giao"
controller.StartShipping = async (req, res) => {
    try {
        const { orderId, shipperId } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là shipper của đơn hàng này' 
            });
        }

        if (bill.status !== 'ready') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng phải ở trạng thái "ready" để bắt đầu giao' 
            });
        }

        // Cập nhật trạng thái
        bill.status = 'shipping';
        await bill.save();

        // Lấy thông tin shipper để trả về
        const shipperInfo = await Shipper.findById(shipperId).lean();

        res.json({ 
            success: true, 
            message: 'Bắt đầu giao hàng thành công', 
            data: {
                ...bill.toObject(),
                shipperName: shipperInfo?.full_name || shipperInfo?.name || 'Shipper không rõ'
            }
        });
    } catch (error) {
        console.error('❌ StartShipping error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server: ' + error.message 
        });
    }
};

// 🔥 Helper function tính phí ship
function calculateShippingFee(shippingMethod, addressInfo, subtotal) {
    if (subtotal >= 500000) {
        return 0;
    }

    const shippingRates = {
        'standard': 30000,
        'express': 50000,
        'same-day': 80000,
        'pickup': 0
    };

    return shippingRates[shippingMethod] || 30000;
}

// 🔥 Helper function format địa chỉ
function formatAddress(addressInfo) {
    if (!addressInfo) return 'Chưa có địa chỉ giao hàng';
    
    if (typeof addressInfo === 'object') {
        const parts = [
            addressInfo.detail_address || addressInfo.address || addressInfo.street,
            addressInfo.ward || addressInfo.ward_name,
            addressInfo.district || addressInfo.district_name,
            addressInfo.city || addressInfo.province || addressInfo.province_name
        ].filter(Boolean);
        
        if (parts.length > 0) {
            return parts.join(', ');
        }
    }
    
    if (typeof addressInfo === 'string') {
        return addressInfo;
    }
    
    return 'Địa chỉ không đầy đủ';
}

// 🔥 THÊM: Helper function format trạng thái
function getStatusDisplay(status) {
    const statusMap = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'ready': 'Sẵn sàng giao',
        'shipping': 'Đang giao',
        'done': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'failed': 'Thất bại'
    };
    
    return statusMap[status] || status;
}

module.exports = controller;