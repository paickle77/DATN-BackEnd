// controllers/api.order.controller.js
const Base        = require('./base.controller');
const Order       = require('../models/order.model');
const OrderDetail = require('../models/orderDetail.model');

const controller = Base(Order);

controller.getList = async (req, res) => {
  const orders = await Order.find().lean();
  const data = await Promise.all(orders.map(async o => {
    const details = await OrderDetail.find({ order_id: o._id }).lean();
    const total = details.reduce((sum, d) => sum + d.quantity * d.price, 0);
    return { ...o, total_price: total };
  }));
  res.json({ msg: 'OK', data });
};

// Ghi đè GET /orders/:id
controller.GetOne = async (req, res) => {
  try {
    // 1) Lấy order chính
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ msg: 'Order không tồn tại', data: null });

    // 2) Lấy chi tiết order_details
    const details = await OrderDetail
      .find({ order_id: req.params.id })
      .populate('product_id', 'name')
      .lean();

    // 3) Map thành items với đúng trường productName, quantity, unitPrice
    const items = details.map(d => ({
      productName: d.product_id.name,
      quantity:    d.quantity,
      unitPrice:   d.price
    }));

    // 4) Trả về order + items
    res.json({ msg: 'OK', data: { ...order, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

// ngay dưới phần exports của controller
controller.replaceOrder = async (req, res) => {
  try {
    // 1) Lấy order gốc
    const original = await Order.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ msg: 'Không tìm thấy đơn gốc' });

    // 2) Chuẩn bị data cho đơn mới
    const { items, address_id, voucher_id } = req.body; // cho phép override nếu cần
    const newOrderData = {
      ...original,
      replacement_of: req.params.id,
      cancel_note: '',
      created_at: new Date(),
      status: 'Chờ xác nhận',
      address_id: address_id || original.address_id,
      voucher_id: voucher_id || original.voucher_id,
    };
    delete newOrderData._id;

    // 3) Tạo đơn mới và đánh dấu đơn gốc
      const newOrder = await Order.create(newOrderData);
          // 3.1) Lấy toàn bộ chi tiết của đơn gốc
          const originalDetails = await OrderDetail.find({ order_id: req.params.id }).lean();
          // 3.2) Chuẩn bị mảng detail mới, thay order_id thành newOrder._id
          const clonedDetails = originalDetails.map(d => {
            const { _id, ...rest } = d;
            return { ...rest, order_id: newOrder._id };
          });
          // 3.3) Ghi hàng loạt vào orderDetails
          await OrderDetail.insertMany(clonedDetails);
          // ==== KẾT THÚC ĐOẠN SAO CHÉP DETAIL ====

          // 3.4) Đánh dấu đơn gốc đã bị thay thế
          await Order.findByIdAndUpdate(req.params.id, { status: 'Đã đổi hàng' });

          return res.status(201).json({ msg: 'Tạo đơn thay thế thành công', data: newOrder });
        } catch (err) {
          console.error(err);
          res.status(500).json({ msg: 'Lỗi server khi tạo đơn thay thế' });
        }
      };

controller.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancel_note: reason },
      { new: true }
    );
    if (!updated) return res.status(404).json({ msg: 'Order không tồn tại' });
    return res.json({ msg: 'Hủy đơn thành công', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server khi hủy đơn' });
  }
};

module.exports = controller;
