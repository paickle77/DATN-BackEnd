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

module.exports = controller;