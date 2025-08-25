// ✅ controllers/api.billdetails.controller.js
const Base = require('./base.controller');
const BillDetail = require('../models/BillDetail.model');
const Product = require('../models/product.model');
const Size = require('../models/size.model');

const controller = Base(BillDetail);

controller.GetAllBillDetail = async (req, res) => {
  try {
    // ✅ CHỈ LẤY DATA ĐÃ LƯU, KHÔNG TÍNH LẠI GIÁ
    const data = await BillDetail.find()
      .populate({
        path: 'bill_id',
        select: 'shipping_fee discount_amount voucher_code original_total total shipping_method status created_at'
      })
      .lean();

    // ✅ Format data để trả về FE
    const formattedData = data.map(item => ({
      ...item,
      // Thông tin từ snapshot (đáng tin cậy)
      product_name: item.product_snapshot?.name || 'Unknown Product',
      product_image: item.product_snapshot?.image_url || '',
      // Giá đã lưu (không tính lại)
      unit_price: item.unit_price,
      total: item.total,
      
      // Thông tin từ bill
      bill_info: item.bill_id ? {
        shipping_fee: item.bill_id.shipping_fee || 0,
        discount_amount: item.bill_id.discount_amount || 0,
        voucher_code: item.bill_id.voucher_code || '',
        shipping_method: item.bill_id.shipping_method || '',
        status: item.bill_id.status || 'unknown'
      } : null
    }));

    res.json({ msg: 'OK', data: formattedData });
  } catch (err) {
    console.error('❌ Lỗi GetAllBillDetail:', err);
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