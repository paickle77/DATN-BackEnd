// controllers/api.bill.controller.js
const Base       = require('./base.controller');
const Bill       = require('../models/bill.model');
const User       = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');  // import model chi tiết hóa đơn

const controller = Base(Bill);

// GET /GetAllBills — lấy toàn bộ hóa đơn như trước
controller.GetAllBills = async (req, res) => {
  try {

    // Sau đó mới populate
    const data = await Bill.find()
      .populate('user_id')
      .populate('address_id');

    

    res.json({ msg: 'OK', data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /bills/:id — override để gắn thêm items
controller.GetOne = async (req, res) => {
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
      product_id:  d.product_id._id,
      productName: d.product_id.name,
      quantity:    d.quantity,
      unitPrice:   d.price
    }));

    // 4) Trả về hóa đơn + items
    res.json({ msg: 'OK', data: { ...bill, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

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