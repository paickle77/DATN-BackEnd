// ✅ controllers/api.billdetails.controller.js
const Base = require('./base.controller');
const BillDetail = require('../models/BillDetail.model');

const controller = Base(BillDetail);

controller.GetAllBillDetail = async (req, res) => {
  try {
    const data = await BillDetail.find()
      .populate('bill_id')
      .populate('product_id')
    //   .populate('voucher_id')
      .exec();

    res.json({ msg: 'OK', data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// ✅ controllers/api.billdetails.controller.js
//tìm theo bill_id
controller.GetBillDetailsByBillId = async (req, res) => {
  try {
    const { bill_id } = req.params;

    if (!bill_id) {
      return res.status(400).json({ msg: 'Thiếu bill_id' });
    }

    const data = await BillDetail.find({ bill_id })
      .populate('bill_id')
      .populate('product_id')
      .exec();

    res.json({ msg: 'OK', data });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

module.exports = controller;
