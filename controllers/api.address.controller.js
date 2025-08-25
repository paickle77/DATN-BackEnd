const Base = require('./base.controller');
const Address = require('../models/address.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Gọi Base để lấy các hàm cơ bản
const baseController = Base(Address);

// Gộp chung các controller lại
module.exports = {
  ...baseController,

  // 🔥 THÊM: GET /addresses - Lấy tất cả addresses (cho admin web)
  getList: async (req, res) => {
    try {
      const addresses = await Address.find()
        .populate('user_id', 'name username full_name email phone')
        .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất
        
      res.json({ 
        success: true,
        msg: 'OK', 
        data: addresses,
        count: addresses.length
      });
    } catch (err) {
      console.error('❌ getList Address Error:', err);
      res.status(500).json({ 
        success: false,
        msg: 'Lỗi khi lấy danh sách địa chỉ: ' + err.message,
        data: [],
        error: err.message
      });
    }
  },

  // Thêm địa chỉ đầu tiên cho user mới
  createFirstAddress: async (req, res) => {
    try {
      const {
        account_id,
        name,
        phone,
        detail_address,
        street, // fallback cho trường hợp cũ
        ward,
        district,
        city,
        latitude,
        longitude,
        address, // địa chỉ dạng string
        is_default = true
      } = req.body;

      // Validation cơ bản
      if (!account_id) {
        return res.status(400).json({ 
          success: false,
          error: 'Thiếu account_id' 
        });
      }

      // Tìm user
      const user = await User.findOne({ account_id: new mongoose.Types.ObjectId(account_id) });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'Không tìm thấy người dùng' 
        });
      }

      // Chuẩn bị dữ liệu địa chỉ
      const addressData = {
        user_id: user._id,
        name: name || user.name,
        phone: phone || user.phone,
        isDefault: is_default
      };

      // Xử lý địa chỉ chi tiết hoặc tọa độ
      if (detail_address || street) {
        // Có địa chỉ chi tiết
        addressData.detail_address = detail_address || street;
        addressData.ward = ward;
        addressData.district = district;
        addressData.city = city;
        
        // Validation cho địa chỉ chi tiết
        if (!addressData.city) {
          return res.status(400).json({ 
            success: false,
            error: 'Thiếu thông tin thành phố' 
          });
        }
      } else if (latitude && longitude) {
        // Chỉ có tọa độ
        addressData.latitude = latitude;
        addressData.longitude = longitude;
      } else if (address) {
        // Có địa chỉ dạng string, cần parse
        const parts = address.split(',').map(part => part.trim());
        if (parts.length >= 4) {
          addressData.detail_address = parts[0];
          addressData.ward = parts[1];
          addressData.district = parts[2];
          addressData.city = parts[3];
        } else {
          addressData.address = address; // lưu nguyên nếu không parse được
        }
      } else {
        return res.status(400).json({ 
          success: false,
          error: 'Thiếu thông tin địa chỉ hoặc tọa độ' 
        });
      }

      // Tạo địa chỉ mới
      const newAddress = new Address(addressData);
      await newAddress.save();

      // Populate thông tin user để trả về
      await newAddress.populate('user_id', 'name email phone');

      res.json({
        success: true,
        message: 'Đã tạo địa chỉ mặc định thành công',
        data: {
          ...newAddress.toObject(),
          _id: newAddress._id.toString(),
          user_id: newAddress.user_id._id.toString()
        }
      });
    } catch (err) {
      console.error('❌ Lỗi tạo địa chỉ đầu tiên:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Lỗi server khi tạo địa chỉ' 
      });
    }
  },

  // Tạo địa chỉ mới (cho user đã có địa chỉ)
  createAddress: async (req, res) => {
    try {
      const {
        user_id,
        name,
        phone,
        detail_address,
        ward,
        district,
        city,
        latitude,
        longitude,
        is_default = false
      } = req.body;

      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'Thiếu user_id' 
        });
      }

      // Kiểm tra user tồn tại
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'Không tìm thấy người dùng' 
        });
      }

      // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
      if (is_default) {
        await Address.updateMany({ user_id }, { isDefault: false });
      }

      const addressData = {
        user_id,
        name: name || user.name,
        phone: phone || user.phone,
        detail_address,
        ward,
        district,
        city,
        latitude,
        longitude,
        isDefault: is_default
      };

      const newAddress = new Address(addressData);
      await newAddress.save();
      await newAddress.populate('user_id', 'name email phone');

      res.json({
        success: true,
        message: 'Đã tạo địa chỉ thành công',
        data: newAddress
      });
    } catch (err) {
      console.error('❌ Lỗi tạo địa chỉ:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Lỗi server khi tạo địa chỉ' 
      });
    }
  },

  // Cập nhật địa chỉ
  updateAddress: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const address = await Address.findById(id);
      if (!address) {
        return res.status(404).json({ 
          success: false,
          error: 'Không tìm thấy địa chỉ' 
        });
      }

      // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
      if (updateData.isDefault || updateData.is_default) {
        await Address.updateMany(
          { user_id: address.user_id, _id: { $ne: id } }, 
          { isDefault: false }
        );
        updateData.isDefault = true;
      }

      const updatedAddress = await Address.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      ).populate('user_id', 'name email phone');

      res.json({
        success: true,
        message: 'Đã cập nhật địa chỉ thành công',
        data: updatedAddress
      });
    } catch (err) {
      console.error('❌ Lỗi cập nhật địa chỉ:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Lỗi server khi cập nhật địa chỉ' 
      });
    }
  },

  // Xóa địa chỉ
  deleteAddress: async (req, res) => {
    try {
      const { id } = req.params;

      const address = await Address.findById(id);
      if (!address) {
        return res.status(404).json({ 
          success: false,
          error: 'Không tìm thấy địa chỉ' 
        });
      }

      // Không cho phép xóa địa chỉ mặc định
      if (address.isDefault) {
        return res.status(400).json({ 
          success: false,
          error: 'Không thể xóa địa chỉ mặc định. Vui lòng đặt địa chỉ khác làm mặc định trước.' 
        });
      }

      await Address.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Đã xóa địa chỉ thành công'
      });
    } catch (err) {
      console.error('❌ Lỗi xóa địa chỉ:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Lỗi server khi xóa địa chỉ' 
      });
    }
  },

  // Lấy địa chỉ theo user ID
  getAddressByUserId: async (req, res) => {
    try {
      const { userId } = req.params;

      const addresses = await Address.find({ user_id: userId })
        .populate('user_id', 'name email phone')
        .sort({ isDefault: -1, createdAt: -1 }); // Mặc định lên đầu, mới nhất lên đầu

      res.json({
        success: true,
        data: addresses,
        count: addresses.length
      });
    } catch (error) {
      console.error('❌ Lỗi lấy địa chỉ theo user:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Lỗi server khi lấy địa chỉ' 
      });
    }
  },

  // Lấy tất cả địa chỉ (giữ nguyên cho admin - tương thích với code cũ)
  GetAllAddress: async (req, res) => {
    try {
      const list = await Address.find()
        .populate('user_id', 'name email phone')
        .sort({ createdAt: -1 })
        .exec();

      res.json({ 
        success: true,
        msg: 'OK', 
        data: list,
        count: list.length 
      });
    } catch (error) {
      console.error('❌ Lỗi lấy tất cả địa chỉ:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Lỗi server khi lấy địa chỉ' 
      });
    }
  },

  // Set địa chỉ mặc định
  setDefault: async (req, res) => {
    try {
      const addressId = req.params.id;
      const targetAddress = await Address.findById(addressId);

      if (!targetAddress) {
        return res.status(404).json({ 
          success: false, 
          message: 'Địa chỉ không tồn tại' 
        });
      }

      const userId = targetAddress.user_id;

      // Bỏ mặc định tất cả địa chỉ của user
      await Address.updateMany({ user_id: userId }, { isDefault: false });

      // Đặt địa chỉ này làm mặc định
      targetAddress.isDefault = true;
      await targetAddress.save();

      return res.json({ 
        success: true, 
        message: 'Đã đặt làm địa chỉ mặc định thành công' 
      });
    } catch (err) {
      console.error('❌ Lỗi đặt mặc định:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message || 'Lỗi server khi đặt địa chỉ mặc định' 
      });
    }
  },

  // Lấy địa chỉ mặc định của user
  getDefaultAddress: async (req, res) => {
    try {
      const { userId } = req.params;

      // ✅ Validate userId
      if (!userId || userId === 'null' || userId === 'undefined') {
        return res.status(400).json({ 
          success: false,
          message: 'User ID không hợp lệ' 
        });
      }

      // ✅ Kiểm tra ObjectId hợp lệ
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ 
          success: false,
          message: 'User ID không đúng định dạng' 
        });
      }

      const defaultAddress = await Address.findOne({ 
        user_id: new mongoose.Types.ObjectId(userId), 
        isDefault: true 
      }).populate('user_id', 'name email phone');

      if (!defaultAddress) {
        return res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy địa chỉ mặc định' 
        });
      }

      res.json({
        success: true,
        data: defaultAddress
      });
    } catch (error) {
      console.error('❌ Lỗi lấy địa chỉ mặc định:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Lỗi server khi lấy địa chỉ mặc định' 
      });
    }
  },

  // ✅ THÊM: Lấy địa chỉ mặc định bằng account_id
  getDefaultAddressByAccountId: async (req, res) => {
    try {
      const { accountId } = req.params;

      // Validate accountId
      if (!accountId || accountId === 'null' || accountId === 'undefined') {
        return res.status(400).json({ 
          success: false,
          message: 'Account ID không hợp lệ' 
        });
      }

      // Kiểm tra ObjectId hợp lệ
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({ 
          success: false,
          message: 'Account ID không đúng định dạng' 
        });
      }

      // Tìm user trước bằng account_id
      const user = await User.findOne({ account_id: new mongoose.Types.ObjectId(accountId) });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy user với account ID này' 
        });
      }

      // Tìm địa chỉ mặc định của user
      const defaultAddress = await Address.findOne({ 
        user_id: user._id, 
        isDefault: true 
      }).populate('user_id', 'name email phone');

      if (!defaultAddress) {
        return res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy địa chỉ mặc định' 
        });
      }

      res.json({
        success: true,
        data: defaultAddress
      });
    } catch (error) {
      console.error('❌ Lỗi lấy địa chỉ mặc định bằng account_id:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Lỗi server khi lấy địa chỉ mặc định' 
      });
    }
  }
};