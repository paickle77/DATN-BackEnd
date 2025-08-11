// controllers/api.bill.controller.js
const Base = require('./base.controller');
const Bill = require('../models/bill.model');
const User = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');
const Address = require('../models/address.model');
const Product = require('../models/product.model'); // ✅ thêm import Product
const Size = require('../models/size.model');

module.exports = Base(Bill);

// GET /GetAllBills
module.exports.GetAllBills = async (req, res) => {
  try {
    const data = await Bill.find()
      .populate('Account_id')
      .populate('address_id');

    res.json({ msg: 'OK', data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /bills/:id
module.exports.GetOne = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).lean();
    if (!bill) {
      return res.status(404).json({ msg: 'Hóa đơn không tồn tại', data: null });
    }

    const details = await BillDetail.find({ bill_id: req.params.id })
      .populate('product_id', 'name')
      .lean();

    const items = details.map(d => ({
      product_id: d.product_id._id,
      productName: d.product_id.name,
      quantity: d.quantity,
      unitPrice: d.price
    }));

    res.json({ msg: 'OK', data: { ...bill, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// POST /CreatePendingBill
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
      shipping_fee, // ✅ Thêm trường này
      items,
    } = req.body;

    if (!Account_id || !address_id || !shipping_method || !payment_method || original_total == null || total == null) {
      return res.status(400).json({ msg: 'Thiếu dữ liệu bắt buộc' });
    }


    // 1️⃣ Tạo hóa đơn
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
      shipping_fee,
      address_snapshot: req.body.address_snapshot || {},
      status: 'pending'
    });

    // 2️⃣ Lưu chi tiết với SNAPSHOT đầy đủ
    for (const item of items) {
      // ✅ Lấy thông tin sản phẩm để tạo snapshot
      const [product, category] = await Promise.all([
        Product.findById(item.product_id).lean(),
        Product.findById(item.product_id).populate('category_id', 'name').lean()
      ]);

      if (!product) {
        console.warn(`⚠️ Product ${item.product_id} not found, skipping...`);
        continue;
      }

      // ✅ Tìm thông tin size
      const sizeInfo = await Size.findOne({
        product_id: item.product_id,
        size: item.size
      }).lean();

      const priceIncrease = sizeInfo?.price_increase || 0;
      const basePrice = product.discount_price || product.price;

      // ✅ SỬ DỤNG GIÁ TỪ FE (đã tính chính xác)
      const unitPrice = item.unit_price || (basePrice + priceIncrease);

      await BillDetail.create({
        bill_id: bill._id,
        product_id: item.product_id,
        size: item.size,
        quantity: item.quantity,
        unit_price: unitPrice, // ✅ Dùng giá từ FE
        total: unitPrice * item.quantity,

        // ✅ SNAPSHOT ĐẦY ĐỦ
        product_snapshot: {
          name: product.name,
          base_price: product.price,
          discount_price: product.discount_price,
          image_url: product.image_url,
          selected_size: item.size,
          size_price_increase: priceIncrease,
          final_unit_price: unitPrice
        }
      });
    }

    res.json({ msg: 'Tạo đơn hàng thành công', billId: bill._id });
  } catch (err) {
    console.error('❌ Lỗi tạo đơn hàng:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};


// PUT /bills/:id/assign-shipper
module.exports.AssignShipper = async (req, res) => {
  try {
    const { shipper_id } = req.body;
    const { id } = req.params;

    if (!shipper_id) {
      return res.status(400).json({ msg: 'Thiếu shipper_id' });
    }

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });
    }

    if (bill.shipper_id) {
      return res.status(400).json({ msg: 'Đơn hàng đã có shipper' });
    }

    bill.shipper_id = shipper_id;
    bill.status = 'shipping';
    await bill.save();

    res.json({ msg: 'Shipper nhận đơn thành công', data: bill });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports.CompleteOrder = async (req, res) => {
  try {
    const { orderId, shipperId, proof_images } = req.body;

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
      { new: true }
    );

    res.json({ success: true, message: 'Hoàn thành đơn hàng thành công', data: updatedBill });
  } catch (error) {
    console.error('CompleteOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports.CancelOrder = async (req, res) => {
  try {
    const { orderId, shipperId, proof_images } = req.body;

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
      { new: true }
    );

    res.json({ success: true, message: 'Đơn hàng đã được hủy thành công', data: updatedBill });
  } catch (error) {
    console.error('CancelOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
