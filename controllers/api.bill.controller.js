// controllers/api.bill.controller.js
const Base       = require('./base.controller');
const Bill       = require('../models/bill.model');
const User       = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');  // import model chi tiết hóa đơn
const Address = require('../models/address.model'); // Import Address model

const controller = Base(Bill);

// GET /GetAllBills — lấy toàn bộ hóa đơn như trước
controller.GetAllBills = async (req, res) => {
    try {
      const data = await Bill.find()
        .populate('user_id', 'name username full_name email') // Chỉ lấy các trường cần thiết
        .populate('address_id') // Giữ nguyên
        .populate('shipper_id', 'full_name name username phone'); // Thêm các trường cụ thể cho shipper
      res.json({ success: true, msg: 'OK', data: data }); // Thêm success để đồng nhất
    } catch (err) {
      res.status(500).json({ success: false, error: err.message }); // Chuẩn hóa lỗi
    }
};


    // 🔥 SỬA CHÍNH: GET /bills/:id — override để gắn thêm items với error handling tốt hơn
    controller.GetOne = async (req, res) => {
      try {
        const bill = await Bill.findById(req.params.id)
          .populate('user_id', 'name username full_name email')
          .populate('address_id')
          .populate('shipper_id', 'full_name name username phone')
          .lean();

        if (!bill) {
          return res.status(404).json({ success: false, msg: 'Hóa đơn không tồn tại' });
        }

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

        const enrichedBill = {
          ...bill,
          items,
          customerName: bill.user_id?.full_name || bill.user_id?.name || bill.user_id?.username || 'Khách hàng không rõ',
          addressString: formatAddress(bill.address_id),
          shipperName: bill.shipper_id?.full_name || bill.shipper_id?.name || bill.shipper_id?.username || '—',
          voucherDisplayCode: bill.voucher_code || '—'
        };

        res.json({ success: true, msg: 'OK', data: enrichedBill });
      } catch (err) {
        console.error('❌ GetOne Bill Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy chi tiết hóa đơn: ' + err.message });
      }
    };

// 🔥 THÊM: Helper function tính phí ship
function calculateShippingFee(shippingMethod, addressInfo, subtotal) {
  // Miễn phí ship cho đơn hàng trên 500k
  if (subtotal >= 500000) {
    return 0;
  }

  // Phí ship theo phương thức
  const shippingRates = {
    'standard': 30000,    // Giao hàng tiêu chuẩn
    'express': 50000,     // Giao hàng nhanh  
    'same-day': 80000,    // Giao hàng trong ngày
    'pickup': 0           // Khách đến lấy
  };

  const baseFee = shippingRates[shippingMethod] || 30000;

  // Có thể thêm logic tính phí theo khoảng cách địa chỉ ở đây
  // Ví dụ: nếu address ngoại thành thì +20k
  
  return baseFee;
}

// 🔥 THÊM: Helper function format địa chỉ
function formatAddress(addressInfo) {
  if (!addressInfo) return 'Chưa có địa chỉ giao hàng';
  
  // Nếu address là object có các field riêng lẻ
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
  
  // Nếu address là string
  if (typeof addressInfo === 'string') {
    return addressInfo;
  }
  
  return 'Địa chỉ không đầy đủ';
}

// PUT /bills/:id/assign-shipper — Gán shipper cho hóa đơn nếu chưa có
controller.AssignShipper = async (req, res) => {
  try {
    const { shipper_id } = req.body;
    const { id } = req.params;

    if (!shipper_id) {
      return res.status(400).json({ msg: 'Thiếu shipper_id' });
    }

    // Kiểm tra đơn đã có người nhận chưa
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });
    }

    if (bill.shipper_id) {
      return res.status(400).json({ msg: 'Đơn hàng đã có shipper' });
    }

    bill.shipper_id = shipper_id;
    bill.status = 'shipping'; // cập nhật trạng thái nếu cần
    await bill.save();

    res.json({ msg: 'Shipper nhận đơn thành công', data: bill });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

controller.CompleteOrder = async (req, res) => {
  try {
    const { orderId, shipperId } = req.body;

    if (!orderId || !shipperId) {
      return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc shipperId' });
    }

    const bill = await Bill.findById(orderId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (bill.shipper_id?.toString() !== shipperId) {
      return res.status(403).json({ success: false, message: 'Bạn không phải là người giao đơn hàng này' });
    }

    if (bill.status === 'done') {
      return res.status(400).json({ success: false, message: 'Đơn hàng đã được hoàn thành trước đó' });
    }

    bill.status = 'done';
    bill.completed_at = new Date(); // có thể thêm trường thời gian hoàn thành nếu cần
    await bill.save();

    res.json({ success: true, message: 'Hoàn thành đơn hàng thành công', data: bill });
  } catch (error) {
    console.error('CompleteOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

controller.CancelOrder = async (req, res) => {
  try {
    const { orderId, shipperId } = req.body;

    if (!orderId || !shipperId) {
      return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc shipperId' });
    }

    const bill = await Bill.findById(orderId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (bill.shipper_id?.toString() !== shipperId) {
      return res.status(403).json({ success: false, message: 'Bạn không phải là shipper của đơn hàng này' });
    }

    if (bill.status === 'done') {
      return res.status(400).json({ success: false, message: 'Đơn hàng đã hoàn thành, không thể hủy' });
    }

    bill.status = 'cancelled';
    bill.cancelled_at = new Date(); // có thể thêm trường thời gian hủy nếu cần
    await bill.save();

    res.json({ success: true, message: 'Đơn hàng đã được hủy thành công', data: bill });
  } catch (error) {
    console.error('CancelOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


module.exports = controller;