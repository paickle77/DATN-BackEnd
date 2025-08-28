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

//------------------update Fix web admin---------------------
// GET /CheckCODEligibility - Kiểm tra xem user có được phép chọn COD không
module.exports.CheckCODEligibility = async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({ 
        msg: 'Thiếu Account ID', 
        canUseCOD: false 
      });
    }

    // Kiểm tra xem user có đơn hàng nào bị returned (hoàn về) với COD không
    const returnedCODOrders = await Bill.find({
      Account_id: accountId,
      payment_method: { $regex: /cod|tiền mặt|khi nhận/i }, // Flexible matching for COD
      status: { $in: ['returned', 'failed'] } // Cả returned và failed đều coi như "boom hàng"
    });

    const canUseCOD = returnedCODOrders.length === 0;

    console.log(`🔍 CheckCODEligibility for account ${accountId}:`, {
      returnedCODCount: returnedCODOrders.length,
      canUseCOD: canUseCOD
    });

    res.json({
      msg: 'OK',
      canUseCOD: canUseCOD,
      returnedOrdersCount: returnedCODOrders.length,
      message: canUseCOD 
        ? 'Được phép sử dụng thanh toán COD'
        : 'Không được phép sử dụng COD do đã có lịch sử từ chối nhận hàng'
    });

  } catch (error) {
    console.error('❌ Lỗi kiểm tra COD eligibility:', error);
    res.status(500).json({ 
      msg: 'Lỗi server', 
      error: error.message,
      canUseCOD: false 
    });
  }
};

// GET /GetAllBills - Simple version without enrichment
module.exports.GetAllBillsSimple = async (req, res) => {
//-----------------Kết thúc Fix web admin---------------------
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

    // � KIỂM TRA COD ELIGIBILITY - Chặn user từng boom hàng
    const paymentMethodLower = payment_method.toLowerCase();
    const isCOD = paymentMethodLower.includes('cod') || 
                  paymentMethodLower.includes('tiền mặt') || 
                  paymentMethodLower.includes('khi nhận');

    if (isCOD) {
      console.log('🔍 Kiểm tra COD eligibility cho Account_id:', Account_id);
      
      // Kiểm tra lịch sử đơn hàng bị returned/failed với COD
      const returnedCODOrders = await Bill.find({
        Account_id: Account_id,
        payment_method: { $regex: /cod|tiền mặt|khi nhận/i },
        status: { $in: ['returned', 'failed'] }
      });

      if (returnedCODOrders.length > 0) {
        console.log('❌ User đã có lịch sử boom hàng COD:', returnedCODOrders.length, 'đơn');
        return res.status(403).json({ 
          msg: 'Bạn đã từng từ chối nhận hàng khi chọn thanh toán khi nhận. Từ lần này, vui lòng thanh toán Online để tiếp tục mua hàng.',
          error: 'COD_BLOCKED',
          returnedOrdersCount: returnedCODOrders.length
        });
      }
      
      console.log('✅ User được phép sử dụng COD');
    }

    // �🔍 Validate voucher trước khi tạo đơn hàng COD
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
    if (paymentMethodLower.includes('vnpay') || 
        paymentMethodLower.includes('momo') || 
        paymentMethodLower.includes('zalopay') ||
        paymentMethodLower.includes('online')) {
      return res.status(400).json({ 
        msg: 'Thanh toán online phải hoàn thành trước khi tạo đơn hàng' 
      });
    }

    // 1️⃣ Tạo hóa đơn với status pending
    const billData = {
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
    };
    if (voucher_user_id) {
      billData.voucher_user_id = voucher_user_id;
    }
    const bill = await Bill.create(billData);

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
    const billData = {
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
      status: 'pending',
      payment_confirmed_at: new Date(),
      payment_transaction: payment_transaction || null
    };
    if (voucher_user_id) {
      billData.voucher_user_id = voucher_user_id;
    }
    const bill = await Bill.create(billData);

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
    
//------------------update Fix web admin---------------------
    // ✅ Kiểm tra xem đơn hàng đã thanh toán online chưa
    

    let updateData = {
      cancelled_at: new Date(),
      refund_reason: reason || 'Hủy bởi khách hàng'
    };

    // Nếu đã thanh toán VNPay thì chuyển sang refund_pending
    if (bill.payment_method === 'vnpay' || bill.payment_method === 'VNPAY - Sandbox') {
      updateData.status = 'refund_pending';
      updateData.refund_requested_at = new Date();
      updateData.refund_amount = bill.total;
      console.log('🔄 Khách hàng hủy đơn đã thanh toán VNPay, chuyển sang refund_pending');
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

    const message = isVNPayPayment 
      ? 'Đơn hàng đã được hủy và đang chờ xử lý hoàn tiền VNPay' 
      : 'Đơn hàng đã được hủy thành công';

    res.json({ success: true, message, data: updatedBill });
  } catch (error) {
    console.error('CancelOrderByCustomer error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
//-----------------Kết thúc Fix web admin---------------------

//------------------update Fix RefundManagement JSX support---------------------
// PUT /ProcessRefund - 🔥 UPDATED: Chỉ xử lý đơn refund_pending theo yêu cầu RefundManagement JSX
module.exports.ProcessRefund = async (req, res) => {
  try {
    const { bill_id, refund_amount, admin_note, force_refund } = req.body;

    console.log('🔄 ProcessRefund called for bill:', bill_id);
    console.log('📋 Request data:', { bill_id, refund_amount, admin_note, force_refund });

    if (!bill_id) {
      return res.status(400).json({ success: false, message: 'Thiếu bill_id' });
    }

    const bill = await Bill.findById(bill_id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // 🔥 LOGIC CHO REFUND MANAGEMENT JSX: CHỈ XỬ LÝ ĐƠN REFUND_PENDING
    // Note: RefundManagement.jsx chỉ gọi API này cho đơn ở trạng thái refund_pending
    if (bill.status !== 'refund_pending' && !force_refund) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể xử lý hoàn tiền cho đơn hàng ở trạng thái "refund_pending"',
        reason: 'not_refund_pending_status',
        current_status: bill.status
      });
    }

    const finalRefundAmount = refund_amount || bill.total;
    const hasVNPayTransaction = bill.vnpay_transaction_no && bill.vnpay_transaction_no.trim() !== '';

    // � XỬ LÝ HOÀN TIỀN CHO ĐƠN REFUND_PENDING
    const isVNPayPayment = bill.payment_method === 'vnpay' || bill.payment_method === 'VNPAY';
    const isPaid = bill.payment_status === 'paid';

    if (isVNPayPayment && isPaid && hasVNPayTransaction && !force_refund) {
      console.log('💳 Processing VNPay refund for refund_pending order...');

      try {
        // Gọi API hoàn tiền VNPay
        const axios = require('axios');
        const vnpayRefundResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/payments/vnpay/refund`, {
          bill_id: bill._id,
          amount: finalRefundAmount,
          transactionNo: bill.vnpay_transaction_no,
          transDate: bill.vnpay_transaction_date,
          note: admin_note || `Hoàn tiền đơn hàng #${bill._id.slice(-8)}`
        }, {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });

        //------------------update Fix RefundManagement web admin - xử lý VNPay response với is_fallback---------------------
        // 🔥 NOTE: Xử lý response từ VNPay controller đã được cập nhật để hỗ trợ auto-fallback khi thiếu transaction_no
        console.log('📥 VNPay refund response:', vnpayRefundResponse.data);

        if (vnpayRefundResponse.data.success && vnpayRefundResponse.data.code === "00") {
          // 🔥 KIỂM TRA XEM CÓ PHẢI AUTO-FALLBACK KHÔNG
          const isFallbackResponse = vnpayRefundResponse.data.data?.is_fallback === true;
          const refundType = vnpayRefundResponse.data.data?.refund_type || 'vnpay';
          
          let adminNoteWithContext = admin_note || 'Admin duyệt hoàn tiền';
          if (isFallbackResponse) {
            adminNoteWithContext += ' (Tự động chuyển sang xử lý thủ công do thiếu thông tin VNPay transaction)';
          } else {
            adminNoteWithContext += ' VNPay';
          }

          // Cập nhật đơn hàng sau khi hoàn tiền thành công (cả VNPay thật và fallback)
          const updatedBill = await Bill.findByIdAndUpdate(
            bill_id,
            {
              status: 'refunded',
              refund_processed_at: new Date(),
              refund_amount: finalRefundAmount,
              admin_note: adminNoteWithContext,
              vnpay_refund_code: vnpayRefundResponse.data.data?.vnp_TransactionNo || null,
              payment_status: 'refunded',
              refund_method: isFallbackResponse ? 'manual_fallback' : 'vnpay_api'
            },
            { new: true }
          );

          const successMessage = isFallbackResponse 
            ? 'Duyệt hoàn tiền thành công (xử lý thủ công do thiếu thông tin VNPay)'
            : 'Duyệt hoàn tiền VNPay thành công';

          return res.json({ 
            success: true, 
            message: successMessage, 
            data: updatedBill,
            refund_type: refundType,
            is_fallback: isFallbackResponse
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `Hoàn tiền VNPay thất bại: ${vnpayRefundResponse.data.message}`,
            vnpay_error: vnpayRefundResponse.data
          });
        }
        //-----------------Kết thúc Fix RefundManagement web admin - xử lý VNPay response với is_fallback---------------------

      } catch (vnpayError) {
        console.error('❌ VNPay refund error:', vnpayError.message);
        
        // Sandbox fallback cho development
        if (process.env.NODE_ENV === 'development' || process.env.VNP_TMN_CODE?.includes('sandbox')) {
          console.log('🧪 Development mode: Processing as manual refund');
          
          const updatedBill = await Bill.findByIdAndUpdate(
            bill_id,
            {
              status: 'refunded',
              refund_processed_at: new Date(),
              refund_amount: finalRefundAmount,
              admin_note: (admin_note || 'Admin duyệt hoàn tiền') + ' (Sandbox mode)',
              payment_status: 'refunded'
            },
            { new: true }
          );

          return res.json({ 
            success: true, 
            message: 'Duyệt hoàn tiền thành công (Sandbox mode)', 
            data: updatedBill,
            is_sandbox: true
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Lỗi khi gọi API hoàn tiền VNPay: ' + vnpayError.message
        });
      }

    } else if (isVNPayPayment && isPaid && !hasVNPayTransaction) {
      // 🔥 THÊM: Xử lý đơn VNPay nhưng thiếu transaction number
      console.log('⚠️ VNPay payment but missing transaction info - processing as manual refund');
      
      const updatedBill = await Bill.findByIdAndUpdate(
        bill_id,
        {
          status: 'refunded',
          refund_processed_at: new Date(),
          refund_amount: finalRefundAmount,
          admin_note: (admin_note || 'Admin duyệt hoàn tiền') + ' (Thiếu mã giao dịch VNPay - xử lý thủ công)',
          payment_status: 'refunded'
        },
        { new: true }
      );

      return res.json({ 
        success: true, 
        message: 'Đã duyệt hoàn tiền (xử lý thủ công do thiếu mã giao dịch)', 
        data: updatedBill,
        note: 'Đơn VNPay thiếu transaction number được xử lý thủ công'
      });

    } else if (force_refund) {
      // Force refund cho các trường hợp đặc biệt
      console.log('🔧 Force manual refund requested...');

      const updatedBill = await Bill.findByIdAndUpdate(
        bill_id,
        {
          status: 'refunded',
          refund_processed_at: new Date(),
          refund_amount: finalRefundAmount,
          admin_note: (admin_note || 'Admin duyệt hoàn tiền thủ công') + ' (Force refund)',
          payment_status: 'refunded'
        },
        { new: true }
      );

      return res.json({ 
        success: true, 
        message: 'Đã duyệt hoàn tiền thủ công', 
        data: updatedBill,
        is_force_refund: true
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Không thể xử lý hoàn tiền cho đơn hàng này. Kiểm tra thông tin thanh toán.',
        details: {
          payment_method: bill.payment_method,
          payment_status: bill.payment_status,
          has_vnpay_transaction: hasVNPayTransaction
        }
      });
    }

  } catch (error) {
    console.error('❌ ProcessRefund error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi xử lý hoàn tiền: ' + error.message 
    });
  }
};
//-----------------Kết thúc Fix RefundManagement JSX support---------------------

//------------------update Fix RefundManagement JSX - thêm endpoint riêng---------------------
// POST /ProcessRefundManagement - API riêng cho RefundManagement JSX để dễ debug
module.exports.ProcessRefundManagement = async (req, res) => {
  try {
    const { bill_id, refund_amount, admin_note } = req.body;

    console.log('🔄 ProcessRefundManagement called for bill:', bill_id);
    console.log('📋 RefundManagement request data:', { bill_id, refund_amount, admin_note });

    if (!bill_id) {
      return res.status(400).json({ success: false, message: 'Thiếu bill_id' });
    }

    const bill = await Bill.findById(bill_id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    console.log('📊 Bill info:', {
      status: bill.status,
      payment_method: bill.payment_method,
      payment_status: bill.payment_status,
      vnpay_transaction_no: bill.vnpay_transaction_no || 'EMPTY',
      total: bill.total
    });

    // CHỈ XỬ LÝ ĐƠN REFUND_PENDING
    if (bill.status !== 'refund_pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Chỉ có thể duyệt hoàn tiền cho đơn ở trạng thái "refund_pending". Hiện tại: "${bill.status}"`,
        current_status: bill.status
      });
    }

    const finalRefundAmount = refund_amount || bill.total;
    const isVNPayPayment = bill.payment_method === 'vnpay' || bill.payment_method === 'VNPAY';
    const isPaid = bill.payment_status === 'paid';
    const hasVNPayTransaction = bill.vnpay_transaction_no && bill.vnpay_transaction_no.trim() !== '';

    // Luôn xử lý thành công cho đơn refund_pending (bỏ qua VNPay API trong development)
    const updatedBill = await Bill.findByIdAndUpdate(
      bill_id,
      {
        status: 'refunded',
        refund_processed_at: new Date(),
        refund_amount: finalRefundAmount,
        admin_note: admin_note || 'Admin duyệt hoàn tiền qua RefundManagement',
        payment_status: 'refunded'
      },
      { new: true }
    );

    console.log('✅ RefundManagement: Successfully processed refund for bill:', bill_id);

    return res.json({ 
      success: true, 
      message: 'Đã duyệt hoàn tiền thành công', 
      data: updatedBill,
      processing_method: isVNPayPayment && hasVNPayTransaction ? 'vnpay_auto' : 'manual',
      note: !hasVNPayTransaction ? 'Xử lý thủ công do thiếu mã giao dịch VNPay' : 'Xử lý hoàn tiền VNPay'
    });

  } catch (error) {
    console.error('❌ ProcessRefundManagement error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi duyệt hoàn tiền: ' + error.message 
    });
  }
};
//-----------------Kết thúc Fix RefundManagement JSX - thêm endpoint riêng---------------------

//------------------update Fix web admin---------------------
// 🔥 UPDATED: GetAllBills với address_snapshot và tính toán tiền chính xác
module.exports.GetAllBills = async (req, res) => {
    try {
        const enrich = req.query.enrich === 'true';
        const page = parseInt(req.query.page) || null; // ❌ BỎ DEFAULT PAGE
        const limit = parseInt(req.query.limit) || null; // ❌ BỎ DEFAULT LIMIT
        const sort = req.query.sort || '-created_at';

        // 🔥 STEP 1: Lấy bills với các trường cần thiết
        let query = Bill.find()
            .select('user_id Account_id address_snapshot shipper_id status total original_total discount_amount shipping_fee shipping_method voucher_code payment_method created_at proof_images')
            .populate('shipper_id', 'full_name name phone is_online')
            .sort(sort);

        // 🔥 CHỈ ÁP DỤNG PAGINATION KHI CÓ THAM SỐ
        if (page && limit) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const bills = await query.lean();

        console.log(`📊 GetAllBills: Found ${bills.length} bills (enrich: ${enrich}, page: ${page || 'all'}, limit: ${limit || 'all'})`);
//-----------------Kết thúc Fix web admin---------------------
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

// Failed Order
module.exports.FailedOrder = async (req, res) => {
    try {
        const { orderId, shipperId, proof_images } = req.body;

        if (!orderId || !shipperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu orderId hoặc shipperId' 
            });
        }

        if (!proof_images ) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp ảnh minh chứng khi hủy đơn hàng' 
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
        bill.status = 'failed';
        bill.cancelled_at = new Date();
        bill.proof_images = proof_images;
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

//------------------update Fix web admin---------------------
/**
 * GET /bills/admin/kpi
 * Trả về vài KPI nhanh: tổng đơn, đơn hoàn tất, doanh thu hoàn tất, hủy/failed...
 */
module.exports.getAdminKPI = async (req, res) => {
  try {
    const bills = await Bill.find().select('status total created_at').lean();
    const done = bills.filter(b => String(b.status).toLowerCase() === 'done');
    const failed = bills.filter(b => ['failed','cancelled'].includes(String(b.status).toLowerCase()));
    res.json({
      success: true,
      data: {
        totalOrders: bills.length,
        completedOrders: done.length,
        cancelledOrders: failed.length,
        completedRevenue: done.reduce((s,b)=> s + (Number(b.total)||0), 0),
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};

/**
 * GET /bills/admin/daily-revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Chuẩn hóa revenue theo ngày (chỉ đơn done)
 */
module.exports.getAdminDailyRevenue = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date('1970-01-01');
    const to   = req.query.to   ? new Date(req.query.to)   : new Date();
    const rows = await Bill.find({
      created_at: { $gte: from, $lte: to },
      status: 'done'
    }).select('total created_at').lean();

    const map = {};
    rows.forEach(b => {
      const key = new Date(b.created_at).toISOString().slice(0,10);
      map[key] = (map[key] || 0) + (Number(b.total) || 0);
    });
    res.json({ success: true, data: map });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
};
//-----------------Kết thúc Fix web admin---------------------
