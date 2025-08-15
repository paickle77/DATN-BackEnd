// controllers/api.bill.controller.js
const Base = require('./base.controller');
const Bill = require('../models/bill.model');
const User = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');  // import model chi tiết hóa đơn

module.exports = Base(Bill);

// GET /GetAllBills — lấy toàn bộ hóa đơn như trước
module.exports.GetAllBills = async (req, res) => {
  try {

    // Sau đó mới populate
    const data = await Bill.find()
      .populate('Account_id',) // Chỉ lấy email và tên đầy đủ của người dùng
      .populate('address_id');



    res.json({ msg: 'OK', data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /bills/:id — override để gắn thêm items
module.exports.GetOne = async (req, res) => {
  try {
    // 1) Lấy hóa đơn chính
    const bill = await Bill.findById(req.params.id).lean();
    if (!bill) {
      return res.status(404).json({ msg: 'Hóa đơn không tồn tại', data: null });
    }

    // 2) Lấy danh sách chi tiết kèm populate product để có tên
    const details = await BillDetail.find({ bill_id: req.params.id })
      .populate('product_id', 'name')
      .lean();

    // 3) Chuyển thành mảng items giống bên frontend cần
    const items = details.map(d => ({
      product_id: d.product_id._id,
      productName: d.product_id.name,
      quantity: d.quantity,
      unitPrice: d.price
    }));

    // 4) Trả về hóa đơn + items
    res.json({ msg: 'OK', data: { ...bill, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// POST /CreatePendingBill — tạo đơn hàng kèm chi tiết
module.exports.CreatePendingBill = async (req, res) => {
  try {
    const {
      Account_id,
      address_id,
      shipping_method,
      payment_method,
      original_total,
      total,
      discount_amount,
      voucher_code,
      note,
      items
    } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!Account_id || !address_id || !shipping_method || !payment_method || !original_total || !total) {
      return res.status(400).json({ msg: 'Thiếu dữ liệu bắt buộc' });
    }

    // Tạo hóa đơn
    const bill = await Bill.create({
      Account_id,
      address_id,
      shipping_method,
      payment_method,
      original_total,
      total,
      discount_amount,
      voucher_code,
      note,
      status: 'pending'
    });

    // ✅ SỬA: Tạo danh sách chi tiết đơn hàng với đầy đủ thông tin
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const billDetailPayload = {
          bill_id: bill._id,
          product_id: item.product_id,
          size: item.size || 'M', // ✅ Đảm bảo có size (lấy từ frontend hoặc mặc định)
          quantity: item.quantity,
          price: item.unit_price,
          total: item.unit_price * item.quantity // ✅ Tính total
        };

        console.log('📦 Creating BillDetail with payload:', billDetailPayload);

        await BillDetail.create(billDetailPayload);
      }
    }

    res.json({ msg: 'Tạo đơn hàng thành công', billId: bill._id });
  } catch (err) {
    console.error('❌ Lỗi tạo đơn hàng:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// PUT /bills/:id/assign-shipper — Gán shipper cho hóa đơn nếu chưa có
module.exports.AssignShipper = async (req, res) => {
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

module.exports.CompleteOrder = async (req, res) => {
  try {
    const { orderId, shipperId, proof_images  } = req.body;

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

    const updatedBill = await Bill.findByIdAndUpdate(
      orderId,
      {
        status: 'done',
        delivered_at: new Date(),
        proof_images: proof_images
      },
      { new: true } // trả về document đã cập nhật
    );

    res.json({ success: true, message: 'Hoàn thành đơn hàng thành công', data: updatedBill });
  } catch (error) {
    console.error('CompleteOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports.CancelOrder = async (req, res) => {
  try {
    const { orderId, shipperId,  proof_images } = req.body;

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

    const updatedBill = await Bill.findByIdAndUpdate(
      orderId,
      {
        status: 'failed',
        cancelled_at: new Date(),
        proof_images: proof_images
      },
      { new: true } // trả về document đã cập nhật
    );

    res.json({ success: true, message: 'Hoàn thành đơn hàng thành công', data: updatedBill });
  } catch (error) {
    console.error('CancelOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


