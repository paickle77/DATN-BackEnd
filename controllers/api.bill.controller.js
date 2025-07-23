// controllers/api.bill.controller.js
const Base       = require('./base.controller');
const Bill       = require('../models/bill.model');
const BillDetail = require('../models/BillDetail.model');  // import model chi tiết hóa đơn

const controller = Base(Bill);

// GET /GetAllBills — lấy toàn bộ hóa đơn như trước
controller.GetAllBills = async (req, res) => {
  try {
    const data = await Bill.find()
      .populate('user_id')
      .populate('address_id')
    //   .populate('voucher_id')
      .exec();

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

module.exports = controller;
