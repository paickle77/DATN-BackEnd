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