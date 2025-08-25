const Base = require('./base.controller');
const voucher_user = require('../models/voucher_user.model');
const Voucher = require('../models/voucher.model');

module.exports = Base(voucher_user);

function isInDateRange(v) {
  const now = new Date();
  return v.start_date && v.end_date && now >= new Date(v.start_date) && now <= new Date(v.end_date);
}

// API lưu voucher với kiểm tra trùng lặp
module.exports.SaveVoucherToUser = async (req, res) => {
  const { Account_id, voucher_id } = req.body;

  if (!Account_id || !voucher_id) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin Account_id hoặc voucher_id',
    });
  }

  try {
    // 1. Kiểm tra voucher có tồn tại và còn active không
    const voucher = await Voucher.findOne({ 
      _id: voucher_id, 
      status: 'active' 
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại hoặc đã bị vô hiệu hóa',
      });
    }

    const now = new Date();

    // 2. Kiểm tra voucher còn trong thời hạn không
    if (voucher.start_date > now || voucher.end_date < now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher không trong thời gian sử dụng',
      });
    }

    // // 3. Kiểm tra user đã lưu voucher này chưa
    // const existingVoucherUser = await voucher_user.findOne({
    //   Account_id,
    //   voucher_id
    // });

    // if (existingVoucherUser) {
    //   return res.status(409).json({
    //     success: false,
    //     message: 'Bạn đã lưu voucher này rồi!',
    //     data: existingVoucherUser
    //   });
    // }

    // 4. Kiểm tra giới hạn max_usage_per_user - Chỉ đếm voucher đã sử dụng
    if (voucher.max_usage_per_user > 0) {
      const userUsedCount = await voucher_user.countDocuments({
        Account_id,
        voucher_id,
        status: 'in_use' // ✅ Chỉ đếm voucher đã sử dụng
      });

      // 🔍 DEBUG: Kiểm tra tất cả voucher của user này
      const allUserVouchers = await voucher_user.find({
        Account_id,
        voucher_id
      }).select('_id status bill_id saved_at used_at');
      
      console.log(`🔍 DEBUG - User ${Account_id} với voucher ${voucher.code}:`);
      console.log(`📊 Used count (in_use): ${userUsedCount}/${voucher.max_usage_per_user}`);
      console.log('📋 All vouchers:', allUserVouchers);

      if (userUsedCount >= voucher.max_usage_per_user) {
        return res.status(400).json({
          success: false,
          message: `Bạn đã sử dụng ${userUsedCount}/${voucher.max_usage_per_user} lần cho voucher này`,
        });
      }
    }

    // 5. Tạo mới voucher_user với status và code đúng
    const newVoucherUser = new voucher_user({
      Account_id,
      voucher_id,
      code: voucher.code, // ✅ Thêm code từ voucher gốc
      status: 'available', // ✅ Dùng status mới
      saved_at: now
    });

    await newVoucherUser.save();

    // 6. Populate thông tin voucher để trả về
    const populatedVoucherUser = await voucher_user.findById(newVoucherUser._id)
      .populate('voucher_id')
      .exec();

    return res.status(201).json({
      success: true,
      message: 'Lưu voucher thành công!',
      data: populatedVoucherUser
    });

  } catch (err) {
    console.error('SaveVoucherToUser error:', err);
    
    // Xử lý lỗi duplicate key (11000)
    if (err.code === 11000 || err.name === 'MongoServerError') {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã lưu voucher này rồi!',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + err.message,
    });
  }
};


module.exports.GetAllVoucher_user = async (req, res) => {
  try {
    const result = await voucher_user.find()
      .populate('voucher_id')
      .exec();

    res.json({ msg: 'OK', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
module.exports.GetVoucherUserByAccountId = async (req, res) => {
  const { accountId } = req.params;

  try {
    const now = new Date();
    
    const docs = await voucher_user.find({ 
      Account_id: accountId,
      status: 'available' // ✅ CHỈ lấy voucher chưa sử dụng
    })
      .populate('voucher_id')
      .exec();

    // Lọc thêm điều kiện từ voucher gốc
    const validVouchers = docs.filter(doc => {
      const voucher = doc.voucher_id;
      if (!voucher) return false;
      
      return (
        voucher.status === 'active' &&
        voucher.start_date <= now &&
        voucher.end_date >= now
      );
    });

    return res.json({
      success: true,
      message: 'Lấy danh sách voucher khả dụng theo account thành công.',
      data: validVouchers,
    });
  } catch (err) {
    console.error('GetVoucherUserByAccountId error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// API sử dụng voucher với logic kiểm tra đầy đủ
module.exports.UseVoucher = async (req, res) => {
  const { accountId, voucherUserId } = req.body;

  if (!accountId || !voucherUserId) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin accountId hoặc voucherUserId',
    });
  }

  try {
    const now = new Date();

    // 1. Tìm record voucher_user và populate voucher gốc
    const voucherUser = await voucher_user.findOne({
      _id: voucherUserId,
      Account_id: accountId
    }).populate('voucher_id');

    if (!voucherUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher trong danh sách của user',
      });
    }

    // 2. Check voucher_user phải có status = in_use (không phải active)
    if (voucherUser.status !== 'in_use') {
      return res.status(400).json({
        success: false,
        message: `Voucher đã được sử dụng hoặc chưa kích hoạt (trạng thái: ${voucherUser.status})`,
      });
    }

    const voucher = voucherUser.voucher_id;
    
    // 3. Check điều kiện từ voucher gốc
    
    // 3a. Voucher phải active
    if (voucher.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Voucher này đã bị vô hiệu hóa',
      });
    }

    // 3b. Kiểm tra thời hạn
    if (voucher.start_date > now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher chưa đến thời gian sử dụng',
      });
    }

    if (voucher.end_date < now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher đã hết hạn sử dụng',
      });
    }

    // 3c. Kiểm tra số lượng (nếu quantity > 0)
    if (voucher.quantity > 0 && voucher.used_count >= voucher.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Voucher đã hết số lượng sử dụng',
      });
    }

    // 3d. Kiểm tra giới hạn sử dụng per user
    if (voucher.max_usage_per_user > 0) {
      const userUsageCount = await voucher_user.countDocuments({
        Account_id: accountId,
        voucher_id: voucher._id,
        status: 'in_use' // ✅ Đếm voucher đã sử dụng (chỉ có in_use)
      });

      if (userUsageCount >= voucher.max_usage_per_user) {
        return res.status(400).json({
          success: false,
          message: `Bạn đã sử dụng tối đa ${voucher.max_usage_per_user} lần cho voucher này`,
        });
      }
    }

    // 4. Nếu tất cả điều kiện đều hợp lệ, tiến hành sử dụng voucher
    
    // 4a. Update voucher_user: in_use → in_use (không thay đổi, vì đã là in_use)
    voucherUser.used_at = now;
    await voucherUser.save();

    // 4b. Update voucher (tăng used_count)
    voucher.used_count += 1;
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: 'Sử dụng voucher thành công',
      data: {
        voucherUser,
        voucher: {
          code: voucher.code,
          discount_percent: voucher.discount_percent,
          used_count: voucher.used_count,
          quantity: voucher.quantity
        }
      }
    });

  } catch (err) {
    console.error('UseVoucher error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + err.message,
    });
  }
};

// API đánh dấu voucher đang sử dụng (chuyển từ available -> in_use)
module.exports.MarkVoucherInUse = async (req, res) => {
  const { voucherUserId, billId } = req.body; // ✅ Thêm billId

  if (!voucherUserId) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin voucherUserId',
    });
  }

  try {
    // Tìm và cập nhật voucher_user từ available -> in_use
    const updatedVoucherUser = await voucher_user.findOneAndUpdate(
      { 
        _id: voucherUserId,
        status: 'available' // Chỉ cập nhật nếu đang ở trạng thái available
      },
      { 
        status: 'in_use',
        bill_id: billId || null, // ✅ Lưu bill_id nếu có
        updated_at: new Date()
      },
      { new: true }
    ).populate('voucher_id');

    if (!updatedVoucherUser) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại hoặc không ở trạng thái available',
      });
    }

    console.log(`✅ Marked voucher ${updatedVoucherUser.voucher_id?.code} as in_use for user ${updatedVoucherUser.Account_id}`);

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu voucher đang sử dụng',
      data: updatedVoucherUser,
    });

  } catch (error) {
    console.error('❌ Lỗi khi đánh dấu voucher in_use:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đánh dấu voucher đang sử dụng',
      error: error.message,
    });
  }
};

// ❌ API đánh dấu voucher đã sử dụng khi đơn hàng thành công - KHÔNG CẦN THIẾT NỮA
// Voucher chỉ có 2 trạng thái: available → in_use (không cần chuyển thành used)
/* 
module.exports.MarkVoucherAsUsed = async (req, res) => {
  const { voucherUserId } = req.body;

  if (!voucherUserId) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin voucherUserId',
    });
  }

  try {
    const now = new Date();

    // 1. Tìm voucher_user và populate voucher
    const voucherUser = await voucher_user.findById(voucherUserId)
      .populate('voucher_id');

    if (!voucherUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher trong danh sách của user',
      });
    }

    // 2. Kiểm tra status hiện tại
    if (voucherUser.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Voucher này đã được sử dụng rồi',
      });
    }

    if (voucherUser.status !== 'in_use') {
      return res.status(400).json({
        success: false,
        message: 'Voucher không ở trạng thái có thể sử dụng (phải là in_use)',
      });
    }

    // 3. Cập nhật status và used_at
    voucherUser.status = 'used';
    voucherUser.used_at = now;
    await voucherUser.save();

    // 4. Cập nhật used_count của voucher gốc
    const voucher = voucherUser.voucher_id;
    voucher.used_count += 1;
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: 'Đánh dấu voucher đã sử dụng thành công',
      data: {
        voucherUser,
        voucher: {
          code: voucher.code,
          used_count: voucher.used_count,
          quantity: voucher.quantity
        }
      }
    });

  } catch (err) {
    console.error('MarkVoucherAsUsed error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + err.message,
    });
  }
};
*/

// Hàm hỗ trợ: cập nhật trạng thái voucher hết hạn tự động
module.exports.UpdateExpiredVouchers = async (req, res) => {
  try {
    const now = new Date();
    
    // Tìm các voucher_user có status 'available' nhưng voucher gốc đã hết hạn
    const expiredVoucherUsers = await voucher_user.find({
      status: 'available' // ✅ Chỉ kiểm tra voucher chưa dùng
    }).populate({
      path: 'voucher_id',
      match: { 
        $or: [
          { end_date: { $lt: now } },
          { status: 'inactive' }
        ]
      }
    });

    const expiredCount = expiredVoucherUsers.filter(vu => vu.voucher_id).length;

    if (expiredCount > 0) {
      // Xóa voucher hết hạn (không cần chuyển status)
      const deletePromises = expiredVoucherUsers
        .filter(vu => vu.voucher_id)
        .map(vu => voucher_user.deleteOne({ _id: vu._id }));

      await Promise.all(deletePromises);
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật ${expiredCount} voucher hết hạn`,
      data: { expiredCount }
    });

  } catch (err) {
    console.error('UpdateExpiredVouchers error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + err.message,
    });
  }
};
