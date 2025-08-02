// controllers/api.order.controller.js
const Base        = require('./base.controller');
const Order       = require('../models/order.model');
const OrderDetail = require('../models/orderDetail.model');

const controller = Base(Order);

/**
 * GET /orders
 * Trả về list orders kèm total_price
 */
controller.getList = async (req, res) => {
  try {
    // 1) Lấy tất cả orders
    const orders = await Order.find().lean();

    // 2) Với mỗi order, tính tổng giá từ orderdetails
    const data = await Promise.all(orders.map(async o => {
      const details = await OrderDetail.find({ order_id: o._id }).lean();
      const total_price = details.reduce((sum, d) => sum + d.quantity * d.price, 0);
      return { ...o, total_price };
    }));

    res.json({ msg: 'OK', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

/**
 * POST /orders
 * Tạo mới một order, có thể kèm items
 */
controller.Add = async (req, res) => {
  try {
    const {
      user_id,
      address_id,
      voucher_id,
      payment_method,
      shipping_method,
      note,
      items, // mảng { product_id, quantity, price }
    } = req.body;

    // 1) Tạo order
    const newOrder = await Order.create({
      user_id,
      address_id,
      voucher_id,
      payment_method,
      shipping_method,
      note,
      // status, replacement_of, cancel_note sẽ lấy default từ schema
    });

    // 2) Nếu có items đính kèm, tạo luôn orderdetails
    if (Array.isArray(items) && items.length) {
      const details = items.map(it => ({
        order_id:   newOrder._id,
        product_id: it.product_id,
        quantity:   it.quantity,
        price:      it.price
      }));
      await OrderDetail.insertMany(details);
    }

    res.status(201).json({ msg: 'Tạo đơn thành công', data: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

/**
 * PUT /orders/:id
 * Cập nhật order (admin có thể thay đổi status, address, voucher, phương thức, note)
 */
controller.Edit = async (req, res) => {
  try {
    // Lọc chỉ những field được phép cập nhật
    const {
      status,
      address_id,
      voucher_id,
      payment_method,
      shipping_method,
      note
    } = req.body;

    const updates = {
      ...(status !== undefined        && { status }),
      ...(address_id !== undefined    && { address_id }),
      ...(voucher_id !== undefined    && { voucher_id }),
      ...(payment_method !== undefined && { payment_method }),
      ...(shipping_method !== undefined&& { shipping_method }),
      ...(note !== undefined          && { note }),
    };

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: 'Order không tồn tại', data: null });
    }

    res.json({ msg: 'Cập nhật thành công', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

/**
 * GET /orders/:id
 * Lấy chi tiết một order, kèm items
 */
controller.GetOne = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ msg: 'Order không tồn tại', data: null });
    }

    const details = await OrderDetail
      .find({ order_id: req.params.id })
      .populate('product_id', 'name')
      .lean();

    const items = details.map(d => ({
    product_id: d.product_id._id,     // giữ lại product_id
    productName: d.product_id.name,
    quantity:    d.quantity,
    unitPrice:    d.price
  }));


    res.json({ msg: 'OK', data: { ...order, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

/**
 * POST /orders/:id/cancel
 * Hủy đơn (khi admin đồng ý refund)
 */
controller.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'Đã hủy', cancel_note: reason },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: 'Order không tồn tại', data: null });
    }

    res.json({ msg: 'Hủy đơn thành công', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message, data: null });
  }
};

/**
 * POST /orders/:id/replace
 * Tạo đơn thay thế (đổi hàng / trả hàng rồi order lại)
 */
controller.replaceOrder = async (req, res) => {
  try {
    // 1) Lấy order gốc
    const original = await Order.findById(req.params.id).lean();
    if (!original) {
      return res.status(404).json({ msg: 'Không tìm thấy đơn gốc', data: null });
    }

    // 2) Chuẩn bị dữ liệu cho đơn mới
    const {
      items,
      address_id,
      voucher_id,
      payment_method,
      shipping_method,
      note
    } = req.body;

    const newOrderData = {
      ...original,
      replacement_of: req.params.id,
      status: 'Chờ xác nhận',
      cancel_note: '',
      address_id:     address_id     ?? original.address_id,
      voucher_id:     voucher_id     ?? original.voucher_id,
      payment_method: payment_method ?? original.payment_method,
      shipping_method:shipping_method?? original.shipping_method,
      note:           note           ?? original.note,
      created_at:     new Date()
    };
    delete newOrderData._id;

    // 3) Tạo đơn mới
    const newOrder = await Order.create(newOrderData);

        // 4) Chuẩn bị detail: 
        //    - Nếu front-end gửi items thì dùng items đó
        //    - Ngược lại tự clone từ order gốc
        let sourceDetails = [];
        if (Array.isArray(items) && items.length) {
          sourceDetails = items.map(it => ({
            product_id: it.product_id,
            quantity:   it.quantity,
            price:      it.price
          }));
        } else {
          const origD = await OrderDetail.find({ order_id: req.params.id }).lean();
          sourceDetails = origD.map(d => ({
            product_id: d.product_id,
            quantity:   d.quantity,
            price:      d.price
          }));
        }
      
        // 5) Chèn tất cả detail cho đơn mới
        await OrderDetail.insertMany(
          sourceDetails.map(d => ({ ...d, order_id: newOrder._id }))
        );

    // 5) Xóa (nếu có nhầm) và chèn detail cho đơn mới
    await OrderDetail.deleteMany({ order_id: newOrder._id });
    if (sourceDetails.length) {
      await OrderDetail.insertMany(
        sourceDetails.map(d => ({ ...d, order_id: newOrder._id }))
      );
    }

    // 6) Đánh dấu đơn gốc đã “Đã đổi hàng”
    await Order.findByIdAndUpdate(req.params.id, { status: 'Đã đổi hàng' });

    return res.status(201).json({ msg: 'Tạo đơn thay thế thành công', data: newOrder });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: err.message, data: null });
  }
};

module.exports = controller;
