// controllers/api.bill.controller.js
const Base = require('./base.controller');
const Bill = require('../models/bill.model');
const User = require('../models/user.model');
const Account = require('../models/account.model');
const BillDetail = require('../models/BillDetail.model');
const Shipper = require('../models/shipper.model');
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
            return res.status(400).json({ 
                success: false,
                msg: 'Thiếu shipper_id' 
            });
        }

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });
    }

        // Kiểm tra shipper có tồn tại không
        const shipper = await Shipper.findById(shipper_id);
        if (!shipper) {
            return res.status(404).json({ 
                success: false,
                msg: 'Không tìm thấy shipper' 
            });
        }

        // Kiểm tra đơn đã có shipper chưa
        if (bill.shipper_id) {
            return res.status(400).json({ 
                success: false,
                msg: 'Đơn hàng đã có shipper' 
            });
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
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là người giao đơn hàng này' 
            });
        }

        if (bill.status === 'done') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng đã được hoàn thành trước đó' 
            });
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
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là shipper của đơn hàng này' 
            });
        }

        if (bill.status === 'done') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng đã hoàn thành, không thể hủy' 
            });
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

// 🔥 UPDATED: GetAllBills với address_snapshot và tính toán tiền chính xác
module.exports.GetAllBills = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || '-created_at';

        // 🔥 STEP 1: Lấy bills với các trường cần thiết
        const bills = await Bill.find()
            .select('user_id Account_id address_snapshot shipper_id status total original_total discount_amount shipping_fee shipping_method voucher_code payment_method created_at proof_images')
            .populate('shipper_id', 'full_name name phone is_online')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        let responseData = bills;

        if (enrich) {
            // 🔥 STEP 2: Enrich với thông tin user và format dữ liệu
            const enrichedBills = await Promise.all(bills.map(async (bill) => {
                let customerName = 'Khách hàng không rõ';
                let customerPhone = '';
                
                try {
                    let user = null;
                    
                    // Try 1: Tìm user qua user_id trực tiếp
                    if (bill.user_id) {
                        user = await User.findById(bill.user_id).select('name phone').lean();
                    }
                    
                    // Try 2: Tìm user qua Account_id
                    if (!user && bill.Account_id) {
                        user = await User.findOne({ account_id: bill.Account_id }).select('name phone').lean();
                    }
                    
                    if (user) {
                        customerName = user.name || 'Khách hàng không rõ';
                        customerPhone = user.phone || '';
                    }
                    
                } catch (userErr) {
                    console.error('❌ Error finding user for bill:', bill._id, userErr.message);
                }

                // 🔥 SỬ DỤNG address_snapshot thay vì lookup address
                const deliveryInfo = getDeliveryInfo(bill.address_snapshot);
                
                // 🔥 TÍNH TOÁN TIỀN CHÍNH XÁC
                const financialBreakdown = calculateBillFinances(bill);

                return {
                    ...bill,
                    // Trả về ảnh minh chứng (đã chuẩn hoá)
                    proof_images: normalizeProofImages(bill.proof_images),
                    // Customer info
                    customerName,
                    customerPhone,
                    
                    // Delivery info từ address_snapshot
                    deliveryName: deliveryInfo.name,
                    deliveryPhone: deliveryInfo.phone,
                    deliveryAddress: deliveryInfo.address,
                    
                    // Financial breakdown
                    subtotal: financialBreakdown.subtotal,
                    shippingFee: financialBreakdown.shippingFee,
                    discountAmount: financialBreakdown.discountAmount,
                    finalTotal: financialBreakdown.finalTotal,
                    
                    // Shipper info
                    shipperName: (bill.status === 'shipping' || bill.status === 'done') && bill.shipper_id ? 
                                 (bill.shipper_id.full_name || bill.shipper_id.name || 'Shipper không rõ') : 
                                 (bill.status === 'ready' && bill.shipper_id ? 'Đã gán shipper' : '—'),
                    
                    // Display formats
                    shippingMethodDisplay: getShippingMethodDisplay(bill.shipping_method),
                    paymentMethodDisplay: getPaymentMethodDisplay(bill.payment_method),
                    voucherDisplayCode: bill.voucher_code || '—',
                    statusDisplay: getStatusDisplay(bill.status),
                    created_date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : '',
                    
                    // Formatted money
                    subtotal_formatted: formatMoney(financialBreakdown.subtotal),
                    shipping_fee_formatted: formatMoney(financialBreakdown.shippingFee),
                    discount_formatted: formatMoney(financialBreakdown.discountAmount),
                    total_formatted: formatMoney(financialBreakdown.finalTotal)
                };
            }));

            responseData = enrichedBills;
        }

        res.json({ 
            success: true, 
            msg: 'OK', 
            data: responseData, 
            total: await Bill.countDocuments(),
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(await Bill.countDocuments() / limit)
            },
            debug: enrich ? {
                message: 'Bills enriched with address_snapshot and financial breakdown',
                sampleBill: responseData[0] ? {
                    id: responseData[0]._id,
                    customerName: responseData[0].customerName,
                    deliveryName: responseData[0].deliveryName,
                    deliveryAddress: responseData[0].deliveryAddress,
                    subtotal: responseData[0].subtotal_formatted,
                    shippingFee: responseData[0].shipping_fee_formatted,
                    total: responseData[0].total_formatted
                } : null
            } : undefined
        });
    } catch (err) {
        console.error('❌ GetAllBills Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy danh sách hóa đơn: ' + err.message });
    }
};

// 🔥 UPDATED: GetOne với address_snapshot
module.exports.GetOne = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';

        const bill = await Bill.findById(req.params.id)
            .populate('shipper_id', 'full_name name phone is_online')
            .lean();

        if (!bill) {
            return res.status(404).json({ success: false, msg: 'Hóa đơn không tồn tại' });
        }

        // 🔥 USER LOOKUP
        let customerName = 'Khách hàng không rõ';
        let customerPhone = '';
        
        try {
            let user = null;
            
            if (bill.user_id) {
                user = await User.findById(bill.user_id).select('name phone').lean();
            } else if (bill.Account_id) {
                user = await User.findOne({ account_id: bill.Account_id }).select('name phone').lean();
            }
            
            if (user) {
                customerName = user.name || 'Khách hàng không rõ';
                customerPhone = user.phone || '';
            }
        } catch (userErr) {
            console.error('❌ Error finding user:', userErr);
        }

        // 🔥 FETCH BILL DETAILS
        const details = await BillDetail.find({ bill_id: req.params.id })
            .populate('product_id', 'name price')
            .lean();
            
        const items = details.map(d => ({
            product_id: d.product_id?._id || d.product_id,
            productName: d.product_id?.name || 'Sản phẩm không tồn tại',
            quantity: d.quantity || 0,
            unitPrice: d.price || 0,
            size: d.size || '',
            total: d.total || (d.quantity * d.price) || 0
        }));

        // 🔥 DELIVERY INFO từ address_snapshot
        const deliveryInfo = getDeliveryInfo(bill.address_snapshot);
        
        // 🔥 FINANCIAL BREAKDOWN
        const financialBreakdown = calculateBillFinances(bill);

        let responseData = { 
            ...bill, 
            items, 
            customerName, 
            customerPhone,

            // Đảm bảo có field proof_images trả về, ở dạng mảng
            proof_images: normalizeProofImages(bill.proof_images),

            // Delivery info
            deliveryName: deliveryInfo.name,
            deliveryPhone: deliveryInfo.phone,
            deliveryAddress: deliveryInfo.address,
            
            // Financial info
            subtotal: financialBreakdown.subtotal,
            shippingFee: financialBreakdown.shippingFee,
            discountAmount: financialBreakdown.discountAmount,
            finalTotal: financialBreakdown.finalTotal
        };

        if (enrich) {
            responseData = {
                ...responseData,
                shipperName: bill.shipper_id?.full_name || bill.shipper_id?.name || (bill.shipper_id ? 'Shipper không rõ' : '—'),
                shipperPhone: bill.shipper_id?.phone || '',
                
                shippingMethodDisplay: getShippingMethodDisplay(bill.shipping_method),
                paymentMethodDisplay: getPaymentMethodDisplay(bill.payment_method),
                voucherDisplayCode: bill.voucher_code || '—',
                statusDisplay: getStatusDisplay(bill.status),
                created_date: bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : '',
                
                // Formatted money
                subtotal_formatted: formatMoney(financialBreakdown.subtotal),
                shipping_fee_formatted: formatMoney(financialBreakdown.shippingFee),
                discount_formatted: formatMoney(financialBreakdown.discountAmount),
                total_formatted: formatMoney(financialBreakdown.finalTotal)
            };
        }

        res.json({ success: true, msg: 'OK', data: responseData });
    } catch (err) {
        console.error('❌ GetOne Bill Error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi khi lấy chi tiết hóa đơn: ' + err.message });
    }
};

// Chuẩn hoá proof_images thành mảng string (hỗ trợ: mảng, JSON string, base64 đơn)
function normalizeProofImages(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? arr.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    if (s.startsWith('data:image')) return [s];
    if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  return [];
}


// 🔥 HELPER FUNCTIONS

// Lấy thông tin giao hàng từ address_snapshot
function getDeliveryInfo(addressSnapshot) {
    if (!addressSnapshot || typeof addressSnapshot !== 'object') {
        return {
            name: 'Chưa có tên người nhận',
            phone: 'Chưa có SĐT',
            address: 'Chưa có địa chỉ giao hàng'
        };
    }

    const name = addressSnapshot.name || 'Chưa có tên';
    const phone = addressSnapshot.phone || 'Chưa có SĐT';
    
    // Ghép địa chỉ từ các trường
    const addressParts = [
        addressSnapshot.detail,
        addressSnapshot.ward,
        addressSnapshot.district,
        addressSnapshot.city
    ].filter(Boolean);
    
    const address = addressParts.length > 0 
        ? addressParts.join(', ')
        : 'Chưa có địa chỉ';

    return { name, phone, address };
}

// Tính toán breakdown tài chính chính xác
function calculateBillFinances(bill) {
    const originalTotal = Number(bill.original_total) || 0;
    const discountAmount = Number(bill.discount_amount) || 0;
    const shippingFee = Number(bill.shipping_fee) || 0;
    const total = Number(bill.total) || 0;
    
    // Subtotal = original_total - shipping_fee (tiền hàng thuần)
    const subtotal = originalTotal - shippingFee;
    
    // Final total should equal: subtotal + shipping_fee - discount
    const calculatedTotal = subtotal + shippingFee - discountAmount;
    
    return {
        subtotal: Math.max(0, subtotal),
        shippingFee,
        discountAmount,
        finalTotal: total // Sử dụng total từ DB vì đã được tính chính xác
    };
}

// Format tiền tệ
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(Number(amount) || 0);
}

// Display cho shipping method
function getShippingMethodDisplay(method) {
    const methodMap = {
        'Giao hàng nội thành': '🏙️ Giao hàng nội thành',
        'Giao hàng ngoại thành': '🌃 Giao hàng ngoại thành',
        'Giao hàng hỏa tốc': '⚡ Giao hàng hỏa tốc',
        'Nhận tại cửa hàng': '🏪 Nhận tại cửa hàng'
    };
    return methodMap[method] || method || 'Chưa chọn';
}

// Display cho payment method
function getPaymentMethodDisplay(method) {
    const methodMap = {
        'Thanh toán khi nhận hàng': '💵 Thanh toán khi nhận hàng (COD)',
        'VNPAY': '💳 VNPAY',
        'MOMO': '📱 MoMo',
        'Banking': '🏦 Chuyển khoản ngân hàng'
    };
    return methodMap[method] || method || 'Chưa chọn';
}

// Display trạng thái (giữ nguyên)
function getStatusDisplay(status) {
    const statusMap = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'ready': 'Sẵn sàng giao',
        'shipping': 'Đang giao',
        'done': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'failed': 'Thất bại'
    };
    
    return statusMap[status] || status;
}

// 🔥 BỎ CÁC HÀM KHÔNG CẦN THIẾT - CHỈ GIỮ LẠI CÁC HÀM CORE

// Assign Shipper (giữ nguyên)
module.exports.AssignShipper = async (req, res) => {
    try {
        const { shipper_id } = req.body;
        const { id } = req.params;

        if (!shipper_id) {
            return res.status(400).json({ 
                success: false,
                msg: 'Thiếu shipper_id' 
            });
        }

        // Kiểm tra đơn hàng tồn tại
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({ 
                success: false,
                msg: 'Không tìm thấy đơn hàng' 
            });
        }

        // Kiểm tra shipper có tồn tại không
        const shipper = await Shipper.findById(shipper_id);
        if (!shipper) {
            return res.status(404).json({ 
                success: false,
                msg: 'Không tìm thấy shipper' 
            });
        }

        // Kiểm tra đơn đã có shipper chưa
        if (bill.shipper_id) {
            return res.status(400).json({ 
                success: false,
                msg: 'Đơn hàng đã có shipper' 
            });
        }

        // Kiểm tra trạng thái đơn hàng
        if (bill.status !== 'confirmed' && bill.status !== 'ready') {
            return res.status(400).json({ 
                success: false,
                msg: 'Đơn hàng phải ở trạng thái "confirmed" hoặc "ready" để gán shipper' 
            });
        }

        // Cập nhật đơn hàng
        bill.shipper_id = shipper_id;
        bill.status = 'shipping'; 
        await bill.save();

        // Lấy thông tin shipper để trả về
        const updatedBill = await Bill.findById(id).lean();
        const shipperInfo = await Shipper.findById(shipper_id).lean();

        res.json({ 
            success: true,
            msg: 'Gán shipper thành công', 
            data: {
                ...updatedBill,
                shipperName: shipperInfo.full_name || shipperInfo.name || 'Shipper không rõ',
                shipperPhone: shipperInfo.phone || ''
            }
        });
    } catch (err) {
        console.error('❌ AssignShipper Error:', err);
        res.status(500).json({ 
            success: false,
            msg: 'Lỗi khi gán shipper: ' + err.message 
        });
    }
};

// Start Shipping
module.exports.StartShipping = async (req, res) => {
    try {
        const { orderId, shipperId } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là shipper của đơn hàng này' 
            });
        }

        if (bill.status !== 'ready') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng phải ở trạng thái "ready" để bắt đầu giao' 
            });
        }

        bill.status = 'shipping';
        await bill.save();

        const shipperInfo = await Shipper.findById(shipperId).lean();

        res.json({ 
            success: true, 
            message: 'Bắt đầu giao hàng thành công', 
            data: {
                ...bill.toObject(),
                shipperName: shipperInfo?.full_name || shipperInfo?.name || 'Shipper không rõ'
            }
        });
    } catch (error) {
        console.error('❌ StartShipping error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server: ' + error.message 
        });
    }
};

// Complete Order
module.exports.CompleteOrder = async (req, res) => {
    try {
        const { orderId, shipperId } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là người giao đơn hàng này' 
            });
        }

        if (bill.status === 'done') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng đã được hoàn thành trước đó' 
            });
        }

        if (bill.status !== 'shipping') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng phải ở trạng thái "shipping" để hoàn thành' 
            });
        }

        // Cập nhật trạng thái
        bill.status = 'done';
        bill.delivered_at = new Date();
        await bill.save();

        // Lấy thông tin shipper để trả về
        const shipperInfo = await Shipper.findById(shipperId).lean();

        res.json({ 
            success: true, 
            message: 'Hoàn thành đơn hàng thành công', 
            data: {
                ...bill.toObject(),
                shipperName: shipperInfo?.full_name || shipperInfo?.name || 'Shipper không rõ'
            }
        });
    } catch (error) {
        console.error('❌ CompleteOrder error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server: ' + error.message 
        });
    }
};

// Cancel Order
module.exports.CancelOrder = async (req, res) => {
    try {
        const { orderId, shipperId } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        const bill = await Bill.findById(orderId);
        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        if (bill.shipper_id?.toString() !== shipperId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không phải là shipper của đơn hàng này' 
            });
        }

        if (bill.status === 'done') {
            return res.status(400).json({ 
                success: false, 
                message: 'Đơn hàng đã hoàn thành, không thể hủy' 
            });
        }

        // Cập nhật trạng thái
        bill.status = 'cancelled';
        bill.cancelled_at = new Date();
        await bill.save();

        res.json({ 
            success: true, 
            message: 'Đơn hàng đã được hủy thành công', 
            data: bill 
        });
    } catch (error) {
        console.error('❌ CancelOrder error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server: ' + error.message 
        });
    }
};
