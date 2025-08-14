// controllers/api.notification.controller.js - FIXED VERSION - Mobile Compatible
const Base = require('./base.controller');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

const controller = Base(Notification);

// 🔄 GIỮ NGUYÊN HOÀN TOÀN endpoint cũ cho mobile app
// GET /notifications - Mobile app sử dụng (tương thích với req.account)
controller.getList = async (req, res) => {
  try {
    // Xử lý cả req.user (mới) và req.account (cũ) để tương thích
    const user = req.user || req.account;
    
    if (!user) {
      return res.status(401).json({ 
        msg: 'Cần đăng nhập để xem thông báo', 
        data: null 
      });
    }

    let query = {};
    
    // Xử lý role - tương thích với cả account.role và user.role
    const userRole = user.role || 'user';
    const userId = user.id || user._id?.toString();
    
    if (userRole === 'admin') {
      // Admin xem tất cả (cho web admin)
      query = {};
    } else {
      // User thường chỉ xem thông báo của mình
      query = { user_id: userId };
    }

    const data = await Notification.find(query)
      .populate('user_id', 'name email phone')
      .sort({ created_at: -1 })
      .limit(userRole === 'admin' ? 1000 : 100);
      
    res.json({ msg: 'OK', data });
  } catch (err) {
    console.error('getList error:', err);
    res.status(500).json({ msg: err.message });
  }
};

// 🔄 GIỮ NGUYÊN HOÀN TOÀN hàm này cho mobile app
controller.getListByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.user || req.account; // Tương thích cả 2

    if (!user) {
      return res.status(401).json({ 
        msg: 'Cần đăng nhập', 
        data: null 
      });
    }

    const currentUserId = user.id || user._id?.toString();
    const userRole = user.role || 'user';

    // Cho phép user xem thông báo của chính mình, hoặc admin xem tất cả
    if (currentUserId !== userId && userRole !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền truy cập', 
        data: null 
      });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ 
        msg: 'Người dùng không tồn tại', 
        data: null 
      });
    }

    // 🔥 GIỮ NGUYÊN LOGIC CŨ - Lấy thông báo global + personal
    const notes = await Notification.find({
      $or: [
        { type: 'global' },
        { type: 'personal', user_id: userId }
      ]
    }).sort({ created_at: -1 });

    res.json({ msg: 'OK', data: notes });
  } catch (err) {
    console.error('getListByUser error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// 🔄 GIỮ NGUYÊN với cải tiến tương thích
controller.Add = async (req, res) => {
  try {
    const { user_id, content, type = 'personal' } = req.body;
    const user = req.user || req.account; // Tương thích cả 2

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        msg: 'Nội dung thông báo không được để trống', 
        data: null 
      });
    }

    if (content.length > 500) {
      return res.status(400).json({ 
        msg: 'Nội dung thông báo không được quá 500 ký tự', 
        data: null 
      });
    }

    // Nếu là thông báo cá nhân, phải có user_id
    if (type === 'personal' && !user_id) {
      return res.status(400).json({ 
        msg: 'Thông báo cá nhân phải chỉ định người nhận', 
        data: null 
      });
    }

    // Kiểm tra user tồn tại (nếu có user_id)
    if (user_id) {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        return res.status(400).json({ 
          msg: 'Người dùng không tồn tại', 
          data: null 
        });
      }
      
      if (userExists.is_lock) {
        return res.status(400).json({ 
          msg: 'Không thể gửi thông báo đến tài khoản đã bị khóa', 
          data: null 
        });
      }
    }

    // 🔥 GIỮ NGUYÊN LOGIC CŨ - Auto generate title
    const title = content.length > 50 
      ? content.slice(0, 50) + '…' 
      : content;

    const notificationData = {
      content: content.trim(),
      title,
      type
    };

    if (type === 'personal' && user_id) {
      notificationData.user_id = user_id;
    }

    // Chỉ set created_by nếu có user (để tương thích với mobile app cũ)
    if (user) {
      notificationData.created_by = user.id || user._id;
    }

    const note = await Notification.create(notificationData);
    
    // Populate để trả về đầy đủ info
    await note.populate('user_id', 'name email');
    if (note.created_by) {
      await note.populate('created_by', 'name email');
    }

    res.status(201).json({ 
      msg: 'Gửi thông báo thành công', 
      data: note 
    });
  } catch (err) {
    console.error('Add notification error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// 🆕 ENDPOINT MỚI CHỈ CHO WEB ADMIN - Lấy tất cả thông báo
controller.getListForAdmin = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền truy cập', 
        data: null 
      });
    }

    const data = await Notification.find()
      .populate('user_id', 'name email phone')
      .populate('created_by', 'name email')
      .sort({ created_at: -1 });
      
    res.json({ msg: 'OK', data });
  } catch (err) {
    console.error('getListForAdmin error:', err);
    res.status(500).json({ msg: err.message });
  }
};

// 🆕 ENDPOINT MỚI CHỈ CHO WEB ADMIN - Gửi broadcast
controller.broadcast = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền gửi thông báo chung', 
        data: null 
      });
    }

    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        msg: 'Nội dung thông báo không được để trống', 
        data: null 
      });
    }

    if (content.length > 500) {
      return res.status(400).json({ 
        msg: 'Nội dung thông báo không được quá 500 ký tự', 
        data: null 
      });
    }

    const activeUsers = await User.find({ is_lock: { $ne: true } }, '_id');

    if (activeUsers.length === 0) {
      return res.status(400).json({ 
        msg: 'Không có người dùng nào để gửi thông báo', 
        data: null 
      });
    }

    const title = content.length > 50 
      ? content.slice(0, 50) + '…' 
      : content;

    const notifications = activeUsers.map(u => ({
      user_id: u._id,
      content: content.trim(),
      title,
      type: 'global',
      created_by: user.id || user._id
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({ 
      msg: `Đã gửi thông báo đến ${activeUsers.length} người dùng`, 
      data: {
        total_sent: activeUsers.length,
        content: content.trim()
      }
    });
  } catch (err) {
    console.error('broadcast error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// 🔄 Cải thiện Edit để tương thích
controller.Edit = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user) {
      return res.status(401).json({ 
        msg: 'Cần đăng nhập', 
        data: null 
      });
    }

    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ 
        msg: 'Không tìm thấy thông báo', 
        data: null 
      });
    }

    const currentUserId = user.id || user._id?.toString();
    const userRole = user.role || 'user';

    // Kiểm tra quyền
    const canEdit = userRole === 'admin' || 
                   currentUserId === notification.user_id?.toString();

    if (!canEdit) {
      return res.status(403).json({ 
        msg: 'Không có quyền chỉnh sửa thông báo này', 
        data: null 
      });
    }

    // User thường chỉ được đánh dấu đã đọc
    let allowedFields = ['is_read'];
    
    // Admin được phép sửa nhiều hơn
    if (userRole === 'admin') {
      allowedFields = ['is_read', 'content', 'title'];
    }

    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    // Nếu cập nhật content, cần cập nhật lại title
    if (updateData.content) {
      updateData.title = updateData.content.length > 50 
        ? updateData.content.slice(0, 50) + '…' 
        : updateData.content;
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user_id', 'name email');

    res.json({ msg: 'Cập nhật thành công', data: updated });
  } catch (err) {
    console.error('Edit notification error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// 🔄 Cải thiện Delete
controller.Delete = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền xóa thông báo', 
        data: null 
      });
    }

    const deleted = await Notification.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ 
        msg: 'Không tìm thấy thông báo', 
        data: null 
      });
    }

    res.json({ msg: 'Xóa thông báo thành công' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(400).json({ msg: err.message });
  }
};

// 🆕 Thống kê - CHỈ CHO WEB ADMIN
controller.getStats = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền xem thống kê', 
        data: null 
      });
    }

    const [total, unread, global, personal] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ is_read: false }),
      Notification.countDocuments({ type: 'global' }),
      Notification.countDocuments({ type: 'personal' })
    ]);

    res.json({ 
      msg: 'OK', 
      data: {
        total,
        unread,
        global,
        personal,
        read: total - unread
      }
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// 🆕 Bulk operations - CHỈ CHO WEB ADMIN
controller.markReadBulk = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền cập nhật thông báo', 
        data: null 
      });
    }

    const { notification_ids } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({ 
        msg: 'Danh sách ID thông báo không hợp lệ', 
        data: null 
      });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notification_ids } },
      { is_read: true }
    );

    res.json({ 
      msg: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc`,
      data: { modified_count: result.modifiedCount }
    });
  } catch (err) {
    console.error('markReadBulk error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

controller.deleteBulk = async (req, res) => {
  try {
    const user = req.user || req.account;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Không có quyền xóa thông báo', 
        data: null 
      });
    }

    const { notification_ids } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({ 
        msg: 'Danh sách ID thông báo không hợp lệ', 
        data: null 
      });
    }

    const result = await Notification.deleteMany(
      { _id: { $in: notification_ids } }
    );

    res.json({ 
      msg: `Đã xóa ${result.deletedCount} thông báo`,
      data: { deleted_count: result.deletedCount }
    });
  } catch (err) {
    console.error('deleteBulk error:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

module.exports = controller;