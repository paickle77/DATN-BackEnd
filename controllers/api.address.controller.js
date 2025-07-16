const Base = require('./base.controller');
const Address = require('../models/address.model');
const User = require('../models/user.model');
module.exports = Base(Address);

// Thêm địa chỉ đầu tiên cho user mới
module.exports.AddFirstAddress = async (req, res) => {
  try {
    const { user_id, ward, district, city, detail_address, latitude, longitude } = req.body;

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

    const address = new Address({
      user_id,
      name: user.name,
      phone: user.phone,
      ward,
      district,
      city,
      detail_address,
      latitude,
      longitude,
      isDefault: true
    });

    await address.save();

    user.address_id = address._id; // Gắn ID địa chỉ mặc định
    await user.save();

    res.status(201).json({ success: true, message: 'Tạo địa chỉ mặc định thành công', data: address });
  } catch (err) {
    console.error('❌ Lỗi:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


// lấy tất cả địa chỉ của user
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
// set địa chỉ mặc định
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