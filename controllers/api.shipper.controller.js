const Account = require('../models/account.model');
const Shipper = require('../models/shipper.model');
const Base = require('./base.controller');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ✅ Kế thừa 5 hàm CRUD mặc định
const shipperController = Base(Shipper);

// ✅ Override Add method để xử lý boolean đúng
shipperController.Add = async (req, res) => {
  try {
    console.log('📝 Tạo shipper mới:', req.body);
    
    // ✅ Xử lý is_online từ string thành boolean
    const shipperData = {
      ...req.body,
      is_online: req.body.is_online === 'true' || req.body.is_online === true
    };

    // ✅ Nếu account_id là empty string thì set null
    if (!shipperData.account_id || shipperData.account_id === '') {
      shipperData.account_id = null;
    }

    const shipper = new Shipper(shipperData);
    const saved = await shipper.save();
    
    console.log('✅ Tạo shipper thành công:', saved);
    
    res.json({ 
      success: true,
      message: 'Thêm shipper thành công',
      data: saved 
    });
  } catch (err) {
    console.error('❌ Lỗi tạo shipper:', err);
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ✅ Override Edit method để xử lý boolean đúng
shipperController.Edit = async (req, res) => {
  try {
    console.log('📝 Cập nhật shipper:', req.params.id, req.body);
    
    // ✅ Xử lý is_online từ string thành boolean
    const updateData = {
      ...req.body,
      is_online: req.body.is_online === 'true' || req.body.is_online === true
    };

    // ✅ Nếu account_id là empty string thì set null
    if (!updateData.account_id || updateData.account_id === '') {
      updateData.account_id = null;
    }

    // ✅ Xử lý ảnh nếu có
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updated = await Shipper.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy shipper' 
      });
    }

    console.log('✅ Cập nhật shipper thành công:', updated);

    res.json({ 
      success: true,
      message: 'Cập nhật shipper thành công', 
      data: updated 
    });
  } catch (err) {
    console.error('❌ Lỗi cập nhật shipper:', err);
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
};

// 🔧 SỬA: Override Delete method để xóa cả account liên quan
shipperController.Delete = async (req, res) => {
  try {
    const shipperId = req.params.id;
    console.log('🗑️ Xóa shipper ID:', shipperId);

    // Validate shipperId
    if (!mongoose.Types.ObjectId.isValid(shipperId)) {
      return res.status(400).json({ 
        success: false,
        message: 'ID shipper không hợp lệ' 
      });
    }

    // Tìm shipper để lấy account_id
    const shipper = await Shipper.findById(shipperId);
    if (!shipper) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy shipper' 
      });
    }

    console.log('📋 Shipper info:', {
      id: shipper._id,
      name: shipper.full_name,
      account_id: shipper.account_id,
      image: shipper.image
    });

    // ✅ Xóa account liên quan nếu có
    if (shipper.account_id) {
      try {
        console.log('🗑️ Attempting to delete account:', shipper.account_id);
        
        const deletedAccount = await Account.findByIdAndDelete(shipper.account_id);
        if (deletedAccount) {
          console.log('✅ Đã xóa account thành công:', {
            id: deletedAccount._id,
            email: deletedAccount.email
          });
        } else {
          console.warn('⚠️ Account không tồn tại hoặc đã bị xóa:', shipper.account_id);
        }
      } catch (accountError) {
        console.error('❌ Lỗi khi xóa account:', accountError);
        
        // Kiểm tra nếu lỗi không phải là "không tìm thấy" thì dừng lại
        if (accountError.name !== 'CastError') {
          return res.status(500).json({ 
            success: false,
            message: 'Lỗi khi xóa tài khoản liên quan. Vui lòng thử lại.' 
          });
        }
        
        console.warn('⚠️ Account ID không hợp lệ, tiếp tục xóa shipper');
      }
    } else {
      console.log('ℹ️ Shipper không có account_id, chỉ xóa shipper');
    }

    // ✅ Xóa file ảnh nếu có
    if (shipper.image && shipper.image.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', shipper.image);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('🗑️ Đã xóa file ảnh:', imagePath);
        }
      } catch (fileError) {
        console.warn('⚠️ Không thể xóa file ảnh:', fileError.message);
        // Không dừng process vì file ảnh không quan trọng bằng data
      }
    }

    // ✅ Xóa shipper
    const deletedShipper = await Shipper.findByIdAndDelete(shipperId);
    if (!deletedShipper) {
      return res.status(404).json({ 
        success: false,
        message: 'Không thể xóa shipper. Shipper có thể đã bị xóa.' 
      });
    }
    
    console.log('✅ Xóa shipper thành công:', {
      id: deletedShipper._id,
      name: deletedShipper.full_name
    });

    res.json({ 
      success: true,
      message: 'Xóa shipper và tài khoản liên quan thành công',
      data: {
        deleted_shipper_id: shipperId,
        deleted_account_id: shipper.account_id || null
      }
    });

  } catch (err) {
    console.error('❌ Lỗi xóa shipper:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Lỗi server khi xóa shipper'
    });
  }
};

// 🔧 THÊM: Method để kiểm tra shipper có đơn hàng đang xử lý không (optional)
shipperController.checkShipperCanDelete = async (req, res) => {
  try {
    const shipperId = req.params.id;
    
    // Kiểm tra shipper có đơn hàng đang xử lý không
    // (Cần implement tùy theo business logic)
    
    res.json({ 
      success: true,
      canDelete: true,
      message: 'Có thể xóa shipper này'
    });
  } catch (err) {
    console.error('❌ Lỗi kiểm tra shipper:', err);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server'
    });
  }
};

// 🆕 Tạo account mới + shipper (cho web admin)
shipperController.createAccountAndShipper = async (req, res) => {
  try {
    const {
      // Account fields
      email,
      password,
      // Shipper fields
      full_name,
      phone,
      license_number,
      vehicle_type,
      is_online
    } = req.body;

    console.log('📝 Tạo account + shipper mới:', { email, full_name, phone });

    // Validate required fields
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Thiếu thông tin cần thiết: email, password, full_name, phone' 
      });
    }

    // Check if email already exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({ 
        success: false,
        message: 'Email đã tồn tại trong hệ thống' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new account
    const account = new Account({
      email,
      password: hashedPassword,
      role: 'shipper',
      provider: 'local',
      is_lock: false
    });
    
    const savedAccount = await account.save();
    console.log('✅ Account created:', savedAccount._id);

    // Prepare shipper data
    const shipperData = {
      account_id: savedAccount._id,
      full_name,
      phone,
      license_number: license_number || '',
      vehicle_type: vehicle_type || '',
      is_online: is_online === 'true' || is_online === true
    };

    // Handle image upload
    if (req.file) {
      shipperData.image = `/uploads/${req.file.filename}`;
      console.log('📸 Image uploaded:', shipperData.image);
    } else if (req.body.image && req.body.image.startsWith('data:image/')) {
      try {
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `shipper_${Date.now()}.jpg`;
        const imagePath = path.join(__dirname, '../uploads', filename);
        
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(imagePath, imageBuffer);
        shipperData.image = `/uploads/${filename}`;
        console.log('📸 Base64 image saved:', shipperData.image);
      } catch (error) {
        console.error('❌ Error processing base64 image:', error);
      }
    }

    // Create shipper
    const shipper = new Shipper(shipperData);
    const savedShipper = await shipper.save();
    
    console.log('✅ Shipper created:', savedShipper._id);

    res.json({
      success: true,
      message: 'Tạo tài khoản và shipper thành công',
      data: {
        account: {
          _id: savedAccount._id,
          email: savedAccount.email,
          role: savedAccount.role
        },
        shipper: savedShipper
      }
    });

  } catch (err) {
    console.error('❌ Lỗi tạo account + shipper:', err);
    
    // Clean up uploaded file if error
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi server khi tạo account + shipper'
    });
  }
};

// 📝 Tạo tài khoản shipper — chỉ admin dùng (Legacy method)
shipperController.createShipper = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      phone,
      image,
      vehicle_type,
      license_number,
    } = req.body;

    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
    }

    const existing = await Account.findOne({ email });
    if (existing)
      return res.status(400).json({ error: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 10);

    const account = new Account({
      email,
      password: hash,
      role: 'shipper',
    });
    await account.save();

    const shipper = new Shipper({
      account_id: account._id,
      full_name,
      phone,
      image,
      vehicle_type,
      license_number,
    });
    await shipper.save();

    res.json({
      success: true,
      message: 'Tạo shipper thành công',
      data: { account, shipper },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lấy danh sách shipper (gồm cả tài khoản liên kết)
shipperController.getShippers = async (req, res) => {
  try {
    const shippers = await Shipper.find().populate(
      'account_id',
      'email role'
    );
    res.json({ success: true, data: shippers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

shipperController.EditByAccountId = async (req, res) => {
  try {
    const { account_id } = req.params;

    const shipper = await Shipper.findOne({ account_id });

    if (!shipper) {
      return res.status(404).json({ message: 'Shipper not found' });
    }

    // Cập nhật các trường nếu có
    if (req.body.full_name) shipper.full_name = req.body.full_name;
    if (req.body.phone) shipper.phone = req.body.phone;
    if (req.body.license_number) shipper.license_number = req.body.license_number;
    if (req.body.vehicle_type) shipper.vehicle_type = req.body.vehicle_type;

    // Xử lý ảnh nếu có
    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (shipper.image) {
        const oldPath = path.join(__dirname, '..', 'uploads', shipper.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      shipper.image = req.file.filename;
    }

    await shipper.save();

    res.status(200).json({ message: 'Shipper updated successfully', shipper });
  } catch (error) {
    console.error('EditByAccountId error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

shipperController.getShipperByAccountId = async (req, res) => {
  try {
    const { account_id } = req.params;
    

    if (!account_id) {
      return res.status(400).json({ message: 'Thiếu account_id'  });
    }

    const shipper = await Shipper.findOne({ account_id: account_id });
    console.log('🚚 Lấy shipper theo account_id:', account_id);
    console.log('🚚 Kết quả:', shipper);

    if (!shipper) {
      return res.status(404).json({ message: 'Không tìm thấy shipper' });
    }

    res.status(200).json({ success: true, data: shipper });
  } catch (err) {
    console.error('❌ Lỗi khi lấy shipper theo account_id:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

shipperController.updateOnlineStatus = async (req, res) => {
  try {
    const { _id, is_online } = req.body;

    if (!_id || typeof is_online !== 'boolean') {
      return res.status(400).json({ message: 'Thiếu account_id hoặc is_online không hợp lệ' });
    }

    const updated = await Shipper.findOneAndUpdate(
      { _id },
      { is_online },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy shipper' });
    }

    res.json({ success: true, message: 'Cập nhật trạng thái online thành công', data: updated });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật trạng thái online:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = shipperController;