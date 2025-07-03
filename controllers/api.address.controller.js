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

module.exports.setDefault = async (req, res) => {
 try {
    const addressId = req.params.id;
    const targetAddress = await Address.findById(addressId);

    if (!targetAddress) {
      return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
    }

    const userId = targetAddress.user_id;

    // 1. Set tất cả địa chỉ của user này về isDefault = false
    await Address.updateMany({ user_id: userId }, { isDefault: false });

    // 2. Set địa chỉ này là mặc định
    targetAddress.isDefault = true;
    await targetAddress.save();

    return res.json({ success: true, message: 'Đặt làm địa chỉ mặc định thành công' });
  } catch (err) {
    console.error('❌ Lỗi:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}