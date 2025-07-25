const Base = require('./base.controller');
const voucher_user = require('../models/voucher_user.model');
module.exports = Base(voucher_user);


module.exports.GetAllVoucher_user = async (req, res) => {
  try {
    const result  = await voucher_user.find()
      .populate('voucher_id')
      .exec();

    res.json({ msg: 'OK', data: result  });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
module.exports.GetVoucherUserByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const docs = await voucher_user.find({ user_id: userId })
      .populate('voucher_id') // trả full voucher
      .exec();

    return res.json({
      success: true,
      message: 'Lấy danh sách voucher của user thành công.',
      data: docs,
    });
  } catch (err) {
    console.error('GetVoucherUserByUserId error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};