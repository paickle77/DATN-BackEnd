// controllers/api.bill.controller.js
const Base = require('./base.controller');
const Bill = require('../models/bill.model');
const User = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');
const Address = require('../models/address.model');
const Product = require('../models/product.model'); // ✅ thêm import Product
const Size = require('../models/size.model');
const Voucher = require('../models/voucher.model'); // ✅ thêm import Voucher
const voucher_user = require('../models/voucher_user.model'); // ✅ thêm import voucher_user
const voucherUserController = require('./api.voucher_user.controller'); // ✅ Import voucher controller

module.exports = Base(Bill);

// ✅ Helper function: Validate voucher trước khi sử dụng
async function validateVoucherForOrder(voucherUserId, orderTotal) {
  try {
    if (!voucherUserId) return { valid: true }; // Không có voucher thì OK

    console.log('🔍 Validating voucher cho đơn hàng:', { voucherUserId, orderTotal });

    // 1. Tìm voucher_user và populate voucher gốc
    const voucherUser = await voucher_user.findById(voucherUserId).populate('voucher_id');
    
    if (!voucherUser) {
      return { valid: false, message: 'Voucher không tồn tại trong danh sách của bạn' };
    }

    // 2. Kiểm tra status voucher_user phải là available
    if (voucherUser.status !== 'available') {
      return { valid: false, message: `Voucher không khả dụng (trạng thái: ${voucherUser.status})` };
    }

    const voucher = voucherUser.voucher_id;
    const now = new Date();

    // 3. Kiểm tra voucher gốc còn active không
    if (voucher.status !== 'active') {
      return { valid: false, message: 'Voucher đã bị vô hiệu hóa' };
    }

    // 4. Kiểm tra thời hạn voucher
    if (voucher.start_date && voucher.start_date > now) {
      return { valid: false, message: 'Voucher chưa đến thời gian sử dụng' };
    }

    if (voucher.end_date && voucher.end_date < now) {
      return { valid: false, message: 'Voucher đã hết hạn' };
    }

    // 5. ✅ Kiểm tra giá trị đơn hàng tối thiểu (min_order_value)
    if (voucher.min_order_value > 0 && orderTotal < voucher.min_order_value) {
      return { 
        valid: false, 
        message: `Đơn hàng phải có giá trị tối thiểu ${voucher.min_order_value.toLocaleString()}đ để sử dụng voucher này (hiện tại: ${orderTotal.toLocaleString()}đ)` 
      };
    }

    // 6. Kiểm tra số lượng voucher còn lại
    if (voucher.quantity > 0 && voucher.used_count >= voucher.quantity) {
      return { valid: false, message: 'Voucher đã hết số lượng sử dụng' };
    }

    console.log('✅ Voucher validation passed:', {
      code: voucher.code,
      min_order_value: voucher.min_order_value,
      order_total: orderTotal,
      discount_percent: voucher.discount_percent,
      discount_amount: voucher.discount_amount
    });

    return { 
      valid: true, 
      voucher,
      voucherUser 
    };

  } catch (error) {
    console.error('❌ Lỗi validate voucher:', error);
    return { valid: false, message: 'Lỗi kiểm tra voucher: ' + error.message };
  }
}

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

// POST /CreatePendingBill - CHỈ cho COD
module.exports.CreatePendingBill = async (req, res) => {
  try {
    console.log('🔍 DEBUG: voucherUserController keys:', Object.keys(voucherUserController));
    console.log('🔍 DEBUG: MarkVoucherInUse exists:', typeof voucherUserController.MarkVoucherInUse);
    
    const {
      Account_id,
      address_id,
      shipping_method,
      payment_method,
      original_total,
      total,
      discount_amount,
      voucher_code,
      voucher_user_id, // ✅ Thêm voucher_user_id
      note,
      shipping_fee,
      items,
    } = req.body;

    if (!Account_id || !address_id || !shipping_method || !payment_method || original_total == null || total == null) {
      return res.status(400).json({ msg: 'Thiếu dữ liệu bắt buộc' });
    }

    // 🔍 Validate voucher trước khi tạo đơn hàng COD
    if (voucher_user_id) {
      console.log('🎫 Validating voucher for COD order...');
      const voucherValidation = await validateVoucherForOrder(voucher_user_id, original_total);
      
      if (!voucherValidation.valid) {
        console.error('❌ Voucher validation failed:', voucherValidation.message);
        return res.status(400).json({ 
          msg: voucherValidation.message,
          error: 'VOUCHER_VALIDATION_FAILED'
        });
      }
      
      console.log('✅ Voucher validation passed for COD');
    }

    // ✅ CHỈ cho phép COD tạo đơn ngay
    const paymentMethodLower = payment_method.toLowerCase();
    if (paymentMethodLower.includes('vnpay') || 
        paymentMethodLower.includes('momo') || 
        paymentMethodLower.includes('zalopay') ||
        paymentMethodLower.includes('online')) {
      return res.status(400).json({ 
        msg: 'Thanh toán online phải hoàn thành trước khi tạo đơn hàng' 
      });
    }

    // 1️⃣ Tạo hóa đơn với status pending
    const bill = await Bill.create({
      Account_id,
      address_id,
      shipping_method,
      payment_method,
      original_total,
      total,
      discount_amount,
      voucher_code,
      voucher_user_id, // ✅ Lưu voucher_user_id
      note,
      shipping_fee,
      address_snapshot: req.body.address_snapshot || {},
      status: 'pending'
    });

    // 1.5️⃣ Nếu có voucher, đánh dấu voucher đang sử dụng
    if (voucher_user_id) {
      try {
        // Tạo fake req/res object để gọi function trực tiếp
        const voucherReq = {
          body: {
            voucherUserId: voucher_user_id,
            billId: bill._id
          }
        };
        
        const voucherRes = {
          status: (code) => ({
            json: (data) => {
              if (code !== 200) {
                throw new Error(`Voucher error: ${JSON.stringify(data)}`);
              }
              return data;
            }
          }),
          json: (data) => data
        };

        await voucherUserController.MarkVoucherInUse(voucherReq, voucherRes);
        console.log('✅ Đã đánh dấu voucher đang sử dụng');
      } catch (voucherError) {
        console.error('❌ Lỗi khi đánh dấu voucher đang sử dụng:', voucherError.message);
        // Không throw error để không làm fail toàn bộ quá trình tạo bill
      }
    }

    // 2️⃣ Lưu chi tiết với SNAPSHOT đầy đủ
    for (const item of items) {
      const [product, category] = await Promise.all([
        Product.findById(item.product_id).lean(),
        Product.findById(item.product_id).populate('category_id', 'name').lean()
      ]);

      if (!product) {
        console.warn(`⚠️ Product ${item.product_id} not found, skipping...`);
        continue;
      }

      const sizeInfo = await Size.findOne({
        product_id: item.product_id,
        size: item.size
      }).lean();

      const priceIncrease = sizeInfo?.price_increase || 0;
      const basePrice = product.discount_price || product.price;
      const unitPrice = item.unit_price || (basePrice + priceIncrease);

      await BillDetail.create({
        bill_id: bill._id,
        product_id: item.product_id,
        size: item.size,
        quantity: item.quantity,
        unit_price: unitPrice,
        total: unitPrice * item.quantity,
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

    res.json({ 
      msg: 'Tạo đơn hàng thành công', 
      billId: bill._id,
      status: 'pending',
      requiresPayment: false
    });
  } catch (err) {
    console.error('❌ Lỗi tạo đơn hàng:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// POST /CreateBillAfterPayment - Tạo đơn sau khi thanh toán online thành công
module.exports.CreateBillAfterPayment = async (req, res) => {
  try {
    console.log('📊 CreateBillAfterPayment - Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      Account_id,
      address_id,
      shipping_method,
      payment_method,
      original_total,
      total,
      discount_amount,
      voucher_code,
      voucher_user_id, // ✅ Thêm voucher_user_id
      note,
      shipping_fee,
      items,
      payment_transaction // Thông tin giao dịch
    } = req.body;

    console.log('🔍 Extracted fields:', {
      Account_id: Account_id || 'MISSING',
      address_id: address_id || 'MISSING',
      shipping_method: shipping_method || 'MISSING',
      payment_method: payment_method || 'MISSING',
      original_total: original_total ?? 'MISSING',
      total: total ?? 'MISSING',
      items: items ? items.length + ' items' : 'MISSING',
      payment_transaction: payment_transaction ? 'PROVIDED' : 'NULL'
    });

    if (!Account_id || !address_id || !shipping_method || !payment_method || original_total == null || total == null) {
      console.error('❌ Missing required fields:', {
        Account_id: !!Account_id,
        address_id: !!address_id,
        shipping_method: !!shipping_method,
        payment_method: !!payment_method,
        original_total: original_total != null,
        total: total != null
      });
      return res.status(400).json({ msg: 'Thiếu dữ liệu bắt buộc' });
    }

    // 🔍 Validate voucher trước khi tạo đơn hàng
    if (voucher_user_id) {
      console.log('🎫 Validating voucher before creating order...');
      const voucherValidation = await validateVoucherForOrder(voucher_user_id, original_total);
      
      if (!voucherValidation.valid) {
        console.error('❌ Voucher validation failed:', voucherValidation.message);
        return res.status(400).json({ 
          msg: voucherValidation.message,
          error: 'VOUCHER_VALIDATION_FAILED'
        });
      }
      
      console.log('✅ Voucher validation passed');
    }

    // 1️⃣ Tạo hóa đơn với status pending (chờ admin xác nhận)
    const bill = await Bill.create({
      Account_id,
      address_id,
      shipping_method,
      payment_method,
      original_total,
      total,
      discount_amount,
      voucher_code,
      voucher_user_id, // ✅ Lưu voucher_user_id
      note,
      shipping_fee,
      address_snapshot: req.body.address_snapshot || {},
      status: 'pending',
      payment_confirmed_at: new Date(),
      payment_transaction: payment_transaction || null
    });

    // 1.5️⃣ Nếu có voucher, đánh dấu voucher đang sử dụng
    if (voucher_user_id) {
      try {
        // Tạo fake req/res object để gọi function trực tiếp
        const voucherReq = {
          body: {
            voucherUserId: voucher_user_id,
            billId: bill._id
          }
        };
        
        const voucherRes = {
          status: (code) => ({
            json: (data) => {
              if (code !== 200) {
                throw new Error(`Voucher error: ${JSON.stringify(data)}`);
              }
              return data;
            }
          }),
          json: (data) => data
        };

        await voucherUserController.MarkVoucherInUse(voucherReq, voucherRes);
        console.log('✅ Đã đánh dấu voucher đang sử dụng');
      } catch (voucherError) {
        console.error('❌ Lỗi khi đánh dấu voucher đang sử dụng:', voucherError.message);
        // Không throw error để không làm fail toàn bộ quá trình tạo bill
      }
    }

    // 2️⃣ Lưu chi tiết với SNAPSHOT đầy đủ
    for (const item of items) {
      const [product, category] = await Promise.all([
        Product.findById(item.product_id).lean(),
        Product.findById(item.product_id).populate('category_id', 'name').lean()
      ]);

      if (!product) {
        console.warn(`⚠️ Product ${item.product_id} not found, skipping...`);
        continue;
      }

      const sizeInfo = await Size.findOne({
        product_id: item.product_id,
        size: item.size
      }).lean();

      const priceIncrease = sizeInfo?.price_increase || 0;
      const basePrice = product.discount_price || product.price;
      const unitPrice = item.unit_price || (basePrice + priceIncrease);

      await BillDetail.create({
        bill_id: bill._id,
        product_id: item.product_id,
        size: item.size,
        quantity: item.quantity,
        unit_price: unitPrice,
        total: unitPrice * item.quantity,
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

    console.log('✅ Created bill after successful payment:', bill._id);
    res.json({ 
      msg: 'Tạo đơn hàng sau thanh toán thành công', 
      billId: bill._id,
      status: 'pending'
    });
  } catch (err) {
    console.error('❌ Lỗi tạo đơn hàng sau thanh toán:', err);
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

    res.json({success: true, msg: 'Shipper nhận đơn thành công', data: bill});
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

    // ✅ Đánh dấu voucher đã sử dụng khi đơn hàng hoàn thành
    if (bill.voucher_user_id) {
      try {
        // Tạo fake req/res object để gọi function trực tiếp
        const voucherReq = {
          body: {
            voucherUserId: bill.voucher_user_id,
            billId: bill._id
          }
        };
        
        const voucherRes = {
          status: (code) => ({
            json: (data) => {
              if (code !== 200) {
                throw new Error(`Voucher error: ${JSON.stringify(data)}`);
              }
              return data;
            }
          }),
          json: (data) => data
        };

        await voucherUserController.MarkVoucherAsUsed(voucherReq, voucherRes);
        console.log('✅ Đã đánh dấu voucher đã sử dụng');
      } catch (voucherError) {
        console.error('❌ Lỗi khi đánh dấu voucher đã sử dụng:', voucherError.message);
      }
    }

    res.json({ success: true, message: 'Hoàn thành đơn hàng thành công', data: updatedBill });
  } catch (error) {
    console.error('CompleteOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports.CancelOrder = async (req, res) => {
  try {
    const { orderId, shipperId, proof_images, reason } = req.body;

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

    // ✅ Kiểm tra xem đơn hàng đã thanh toán online chưa
    const isOnlinePayment = bill.payment_method && 
      (bill.payment_method.toLowerCase().includes('vnpay') ||
       bill.payment_method.toLowerCase().includes('momo') ||
       bill.payment_method.toLowerCase().includes('zalopay') ||
       bill.payment_method.toLowerCase().includes('online'));

    const isPaid = bill.payment_confirmed_at != null;

    let updateData = {
      cancelled_at: new Date(),
      proof_images: proof_images || '',
      refund_reason: reason || 'Hủy bởi shipper'
    };

    // Nếu đã thanh toán online thì chuyển sang refund_pending
    if (isOnlinePayment && isPaid) {
      updateData.status = 'refund_pending';
      updateData.refund_requested_at = new Date();
      updateData.refund_amount = bill.total;
      console.log('🔄 Đơn hàng đã thanh toán online, chuyển sang trạng thái refund_pending');
    } else {
      updateData.status = 'failed';
      console.log('💰 Đơn hàng COD hoặc chưa thanh toán, chuyển sang trạng thái failed');
    }

    const updatedBill = await Bill.findByIdAndUpdate(orderId, updateData, { new: true });

    // ❌ DISABLED: Không rollback voucher khi hủy đơn hàng
    // Voucher một khi đã sử dụng sẽ mất luôn, không được hoàn lại
    if (bill.voucher_user_id) {
      console.log('⚠️ Voucher đã được sử dụng và sẽ không được hoàn lại khi hủy đơn hàng:', bill.voucher_user_id);
    }

    const message = isOnlinePayment && isPaid 
      ? 'Đơn hàng đã được hủy và đang chờ xử lý hoàn tiền' 
      : 'Đơn hàng đã được hủy thành công';

    res.json({ success: true, message, data: updatedBill });
  } catch (error) {
    console.error('CancelOrder error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// POST /CancelOrderByCustomer - Khách hàng hủy đơn
module.exports.CancelOrderByCustomer = async (req, res) => {
  try {
    const { orderId, Account_id, reason } = req.body;

    if (!orderId || !Account_id) {
      return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc Account_id' });
    }

    const bill = await Bill.findById(orderId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Kiểm tra quyền sở hữu đơn hàng
    if (bill.Account_id.toString() !== Account_id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng này' });
    }

    // Chỉ cho phép hủy đơn ở trạng thái pending (chưa xác nhận)
    if (bill.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn hàng khi chưa được xác nhận' });
    }

    // ✅ Kiểm tra xem đơn hàng đã thanh toán online chưa
    const isOnlinePayment = bill.payment_method && 
      (bill.payment_method.toLowerCase().includes('vnpay') ||
       bill.payment_method.toLowerCase().includes('momo') ||
       bill.payment_method.toLowerCase().includes('zalopay') ||
       bill.payment_method.toLowerCase().includes('online'));

    const isPaid = bill.payment_confirmed_at != null;

    let updateData = {
      cancelled_at: new Date(),
      refund_reason: reason || 'Hủy bởi khách hàng'
    };

    // Nếu đã thanh toán online thì chuyển sang refund_pending
    if (isOnlinePayment && isPaid) {
      updateData.status = 'refund_pending';
      updateData.refund_requested_at = new Date();
      updateData.refund_amount = bill.total;
      console.log('🔄 Khách hàng hủy đơn đã thanh toán online, chuyển sang refund_pending');
    } else {
      updateData.status = 'cancelled';
      console.log('💰 Khách hàng hủy đơn COD hoặc chưa thanh toán, chuyển sang cancelled');
    }

    const updatedBill = await Bill.findByIdAndUpdate(orderId, updateData, { new: true });

    // ❌ DISABLED: Không rollback voucher khi khách hàng hủy đơn hàng  
    // Voucher một khi đã sử dụng sẽ mất luôn, không được hoàn lại
    if (bill.voucher_user_id) {
      console.log('⚠️ Voucher đã được sử dụng và sẽ không được hoàn lại khi khách hàng hủy đơn:', bill.voucher_user_id);
    }

    const message = isOnlinePayment && isPaid 
      ? 'Đơn hàng đã được hủy và đang chờ xử lý hoàn tiền' 
      : 'Đơn hàng đã được hủy thành công';

    res.json({ success: true, message, data: updatedBill });
  } catch (error) {
    console.error('CancelOrderByCustomer error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// PUT /ProcessRefund - Admin xử lý hoàn tiền
module.exports.ProcessRefund = async (req, res) => {
  try {
    const { orderId, refund_amount, admin_note } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Thiếu orderId' });
    }

    const bill = await Bill.findById(orderId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (bill.status !== 'refund_pending') {
      return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái chờ hoàn tiền' });
    }

    const finalRefundAmount = refund_amount || bill.total;

    const updatedBill = await Bill.findByIdAndUpdate(
      orderId,
      {
        status: 'refunded',
        refund_processed_at: new Date(),
        refund_amount: finalRefundAmount,
        admin_note: admin_note || 'Hoàn tiền thành công'
      },
      { new: true }
    );

    res.json({ 
      success: true, 
      message: 'Xử lý hoàn tiền thành công', 
      data: updatedBill 
    });
  } catch (error) {
    console.error('ProcessRefund error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
