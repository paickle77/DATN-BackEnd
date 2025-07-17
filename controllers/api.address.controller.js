const Base = require('./base.controller');
const Address = require('../models/address.model');
module.exports = Base(Address);


module.exports.GetAllAddress = async (req, res) => {
    try {
        const list = await Address.find()
            .populate('user_id', 'name email phone')
            .exec();

        res.json({ msg: "OK", data: list });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// controllers/addressController.js
module.exports.setDefault = async (req, res) => {
  try {
    const addressId = req.params.id;
    const targetAddress = await Address.findById(addressId);

    if (!targetAddress) {
      return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
    }

    const userId = targetAddress.user_id;

    // Set tất cả địa chỉ của user về false
    await Address.updateMany({ user_id: userId }, { isDefault: false });

    // Set địa chỉ được chọn là true
    targetAddress.isDefault = true;
    await targetAddress.save();

    return res.json({ success: true, message: 'Đã đặt làm mặc định' });
  } catch (err) {
    console.error('❌ Lỗi:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
