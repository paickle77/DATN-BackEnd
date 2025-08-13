// controllers/api.bill.controller.js - 🔥 UPDATED VERSION với address_snapshot
const Base       = require('./base.controller');
const Bill       = require('../models/bill.model');
const User       = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');
const Shipper = require('../models/shipper.model');

const controller = Base(Bill);

// 🔥 UPDATED: GetAllBills với address_snapshot và tính toán tiền chính xác
controller.GetAllBills = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || '-created_at';

        // 🔥 STEP 1: Lấy bills với các trường cần thiết
        const bills = await Bill.find()
            .select('user_id Account_id address_snapshot shipper_id status total original_total discount_amount shipping_fee shipping_method voucher_code payment_method created_at')
            .populate('shipper_id', 'full_name name phone is_online')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        let responseData = bills;

        if (enrich) {
            // 🔥 STEP 2: Enrich với thông tin user và format dữ liệu
            const enrichedBills = await Promise.all(bills.map(async (bill) => {
                let customerName = 'Khách hàng không rõ';
                let customerPhone = '';
                
                try {
                    let user = null;
                    
                    // Try 1: Tìm user qua user_id trực tiếp
                    if (bill.user_id) {
                        user = await User.findById(bill.user_id).select('name phone').lean();
                    }
                    
                    // Try 2: Tìm user qua Account_id
                    if (!user && bill.Account_id) {
                        user = await User.findOne({ account_id: bill.Account_id }).select('name phone').lean();
                    }
                    
                    if (user) {
                        customerName = user.name || 'Khách hàng không rõ';
                        customerPhone = user.phone || '';
                    }
                    
                } catch (userErr) {
                    console.error('❌ Error finding user for bill:', bill._id, userErr.message);
                }

                // 🔥 SỬ DỤNG address_snapshot thay vì lookup address
                const deliveryInfo = getDeliveryInfo(bill.address_snapshot);
                
                // 🔥 TÍNH TOÁN TIỀN CHÍNH XÁC
                const financialBreakdown = calculateBillFinances(bill);

                return {
                    ...bill,
                    // Customer info
                    customerName,
                    customerPhone,
                    
                    // Delivery info từ address_snapshot
                    deliveryName: deliveryInfo.name,
                    deliveryPhone: deliveryInfo.phone,
                    deliveryAddress: deliveryInfo.address,
                    
                    // Financial breakdown
                    subtotal: financialBreakdown.subtotal,
                    shippingFee: financialBreakdown.shippingFee,
                    discountAmount: financialBreakdown.discountAmount,
                    finalTotal: financialBreakdown.finalTotal,
                    
                    // Shipper info
                    shipperName: (bill.status === 'shipping' || bill.status === 'done') && bill.shipper_id ? 
                                 (bill.shipper_id.full_name || bill.shipper_id.name || 'Shipper không rõ') : 
                                 (bill.status === 'ready' && bill.shipper_id ? 'Đã gán shipper' : '—'),
                    
                    // Display formats
                    shippingMethodDisplay: getShippingMethodDisplay(bill.shipping_method),
                    paymentMethodDisplay: getPaymentMethodDisplay(bill.payment_method),
                    voucherDisplayCode: bill.voucher_code || '—',
                    statusDisplay: getStatusDisplay(bill.status),
                    created_date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : '',
                    
                    // Formatted money
                    subtotal_formatted: formatMoney(financialBreakdown.subtotal),
                    shipping_fee_formatted: formatMoney(financialBreakdown.shippingFee),
                    discount_formatted: formatMoney(financialBreakdown.discountAmount),
                    total_formatted: formatMoney(financialBreakdown.finalTotal)
                };
            }));

            responseData = enrichedBills;
        }

        res.json({ 
            success: true, 
            msg: 'OK', 
            data: responseData, 
            total: await Bill.countDocuments(),
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(await Bill.countDocuments() / limit)
            },
            debug: enrich ? {
                message: 'Bills enriched with address_snapshot and financial breakdown',
                sampleBill: responseData[0] ? {
                    id: responseData[0]._id,
                    customerName: responseData[0].customerName,
                    deliveryName: responseData[0].deliveryName,
                    deliveryAddress: responseData[0].deliveryAddress,
                    subtotal: responseData[0].subtotal_formatted,
                    shippingFee: responseData[0].shipping_fee_formatted,
                    total: responseData[0].total_formatted
                } : null
            } : undefined
        });
    } catch (err) {
        console.error('❌ GetAllBills Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy danh sách hóa đơn: ' + err.message });
    }
};

// 🔥 UPDATED: GetOne với address_snapshot
controller.GetOne = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';

        const bill = await Bill.findById(req.params.id)
            .populate('shipper_id', 'full_name name phone is_online')
            .lean();

        if (!bill) {
            return res.status(404).json({ success: false, msg: 'Hóa đơn không tồn tại' });
        }

        // 🔥 USER LOOKUP
        let customerName = 'Khách hàng không rõ';
        let customerPhone = '';
        
        try {
            let user = null;
            
            if (bill.user_id) {
                user = await User.findById(bill.user_id).select('name phone').lean();
            } else if (bill.Account_id) {
                user = await User.findOne({ account_id: bill.Account_id }).select('name phone').lean();
            }
            
            if (user) {
                customerName = user.name || 'Khách hàng không rõ';
                customerPhone = user.phone || '';
            }
        } catch (userErr) {
            console.error('❌ Error finding user:', userErr);
        }

        // 🔥 FETCH BILL DETAILS
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

        // 🔥 DELIVERY INFO từ address_snapshot
        const deliveryInfo = getDeliveryInfo(bill.address_snapshot);
        
        // 🔥 FINANCIAL BREAKDOWN
        const financialBreakdown = calculateBillFinances(bill);

        let responseData = { 
            ...bill, 
            items, 
            customerName, 
            customerPhone,
            
            // Delivery info
            deliveryName: deliveryInfo.name,
            deliveryPhone: deliveryInfo.phone,
            deliveryAddress: deliveryInfo.address,
            
            // Financial info
            subtotal: financialBreakdown.subtotal,
            shippingFee: financialBreakdown.shippingFee,
            discountAmount: financialBreakdown.discountAmount,
            finalTotal: financialBreakdown.finalTotal
        };

        if (enrich) {
            responseData = {
                ...responseData,
                shipperName: bill.shipper_id?.full_name || bill.shipper_id?.name || (bill.shipper_id ? 'Shipper không rõ' : '—'),
                shipperPhone: bill.shipper_id?.phone || '',
                
                shippingMethodDisplay: getShippingMethodDisplay(bill.shipping_method),
                paymentMethodDisplay: getPaymentMethodDisplay(bill.payment_method),
                voucherDisplayCode: bill.voucher_code || '—',
                statusDisplay: getStatusDisplay(bill.status),
                created_date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : '',
                
                // Formatted money
                subtotal_formatted: formatMoney(financialBreakdown.subtotal),
                shipping_fee_formatted: formatMoney(financialBreakdown.shippingFee),
                discount_formatted: formatMoney(financialBreakdown.discountAmount),
                total_formatted: formatMoney(financialBreakdown.finalTotal)
            };
        }

        res.json({ success: true, msg: 'OK', data: responseData });
    } catch (err) {
        console.error('❌ GetOne Bill Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy chi tiết hóa đơn: ' + err.message });
    }
};

// 🔥 HELPER FUNCTIONS

// Lấy thông tin giao hàng từ address_snapshot
function getDeliveryInfo(addressSnapshot) {
    if (!addressSnapshot || typeof addressSnapshot !== 'object') {
        return {
            name: 'Chưa có tên người nhận',
            phone: 'Chưa có SĐT',
            address: 'Chưa có địa chỉ giao hàng'
        };
    }

    const name = addressSnapshot.name || 'Chưa có tên';
    const phone = addressSnapshot.phone || 'Chưa có SĐT';
    
    // Ghép địa chỉ từ các trường
    const addressParts = [
        addressSnapshot.detail,
        addressSnapshot.ward,
        addressSnapshot.district,
        addressSnapshot.city
    ].filter(Boolean);
    
    const address = addressParts.length > 0 
        ? addressParts.join(', ')
        : 'Chưa có địa chỉ';

    return { name, phone, address };
}

// Tính toán breakdown tài chính chính xác
function calculateBillFinances(bill) {
    const originalTotal = Number(bill.original_total) || 0;
    const discountAmount = Number(bill.discount_amount) || 0;
    const shippingFee = Number(bill.shipping_fee) || 0;
    const total = Number(bill.total) || 0;
    
    // Subtotal = original_total - shipping_fee (tiền hàng thuần)
    const subtotal = originalTotal - shippingFee;
    
    // Final total should equal: subtotal + shipping_fee - discount
    const calculatedTotal = subtotal + shippingFee - discountAmount;
    
    return {
        subtotal: Math.max(0, subtotal),
        shippingFee,
        discountAmount,
        finalTotal: total // Sử dụng total từ DB vì đã được tính chính xác
    };
}

// Format tiền tệ
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(Number(amount) || 0);
}

// Display cho shipping method
function getShippingMethodDisplay(method) {
    const methodMap = {
        'Giao hàng nội thành': '🏙️ Giao hàng nội thành',
        'Giao hàng ngoại thành': '🌃 Giao hàng ngoại thành',
        'Giao hàng hỏa tốc': '⚡ Giao hàng hỏa tốc',
        'Nhận tại cửa hàng': '🏪 Nhận tại cửa hàng'
    };
    return methodMap[method] || method || 'Chưa chọn';
}

// Display cho payment method
function getPaymentMethodDisplay(method) {
    const methodMap = {
        'Thanh toán khi nhận hàng': '💵 Thanh toán khi nhận hàng (COD)',
        'VNPAY': '💳 VNPAY',
        'MOMO': '📱 MoMo',
        'Banking': '🏦 Chuyển khoản ngân hàng'
    };
    return methodMap[method] || method || 'Chưa chọn';
}

// Display trạng thái (giữ nguyên)
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

// 🔥 BỎ CÁC HÀM KHÔNG CẦN THIẾT - CHỈ GIỮ LẠI CÁC HÀM CORE

// Assign Shipper (giữ nguyên)
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

// Start Shipping
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

        bill.status = 'shipping';
        await bill.save();

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

// Complete Order
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

// Cancel Order
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

module.exports = controller;