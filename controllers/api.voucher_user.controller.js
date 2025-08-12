const Base = require('./base.controller');
const voucher_user = require('../models/voucher_user.model');

module.exports = Base(voucher_user);


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
    const docs = await voucher_user.find({ Account_id: accountId })
      .populate('voucher_id') // trả full thông tin voucher
      .exec();

    return res.json({
      success: true,
      message: 'Lấy danh sách voucher theo account thành công.',
      data: docs,
    });
  } catch (err) {
    console.error('GetVoucherUserByAccountId error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// API đổi trạng thái Voucher
module.exports.UpdateVoucherUserStatus = async (req, res) => {
  const { accountId, voucherid } = req.params; // lấy từ URL params
  const { status } = req.body; // trạng thái mới gửi từ body

  // Kiểm tra status hợp lệ
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      msg: 'Trạng thái không hợp lệ (phải là "active" hoặc "inactive")',
      data: null
    });
  }

  try {
    // Tìm và cập nhật theo cả accountId + voucherid
    const updatedVoucherUser = await voucher_user.findOneAndUpdate(
      { Account_id: accountId, voucher_id: voucherid },
      { status },
      { new: true }
    ).populate('voucher_id');

    if (!updatedVoucherUser) {
      return res.status(404).json({
        msg: 'Không tìm thấy bản ghi với accountId và voucherid đã cho',
        data: null
      });
    }

    return res.status(200).json({
      msg: 'Cập nhật trạng thái thành công',
      data: updatedVoucherUser
    });

  } catch (err) {
    console.error('UpdateVoucherUserStatus error:', err);
    return res.status(500).json({
      msg: 'Lỗi server: ' + err.message,
      data: null
    });
  }
};
