// controllers/api.notification.controller.js - FIXED VERSION - Mobile Compatible
const Base = require('./base.controller');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

const controller = Base(Notification);

// POST /notifications - Tạo thông báo mới
controller.Add = async (req, res) => {
  try {
    const { user_id, title, content, icon = 'notifications' } = req.body;

    if (!user_id || !content) {
      return res.status(400).json({ msg: 'user_id và content là bắt buộc', data: null });
    }

    const notification = await Notification.create({
      user_id,
      title: title || 'Thông báo mới',
      content,
      icon
    });

    res.status(201).json({ msg: 'Tạo thông báo thành công', data: notification });
  } catch (err) {
    console.error('Error in Add notification:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// GET /notifications/user/:userId - Lấy thông báo của user
controller.getListByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Getting notifications for userId:', userId);

    const notifications = await Notification.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(50);

    console.log(`Found ${notifications.length} notifications for user ${userId}`);
    res.json({ msg: 'OK', data: notifications });
  } catch (err) {
    console.error('Error in getListByUser:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// GET /notifications/unread-count/:userId - Đếm số thông báo chưa đọc
controller.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Getting unread count for userId:', userId);
    
    const count = await Notification.countDocuments({ 
      user_id: userId, 
      is_read: false 
    });
    
    console.log(`Found ${count} unread notifications for user ${userId}`);
    res.json({ msg: 'OK', data: { count } });
  } catch (err) {
    console.error('Error in getUnreadCount:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// PUT /notifications/:id/mark-read - Đánh dấu đã đọc
controller.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Marking notification as read:', id);
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ msg: 'Không tìm thấy thông báo', data: null });
    }

    res.json({ msg: 'Đã đánh dấu đã đọc', data: notification });
  } catch (err) {
    console.error('Error in markAsRead:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// PUT /notifications/mark-all-read/:userId - Đánh dấu tất cả đã đọc
controller.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Marking all notifications as read for userId:', userId);
    
    const result = await Notification.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true }
    );

    console.log(`Successfully marked ${result.modifiedCount} notifications as read`);
    res.json({ msg: 'Đã đánh dấu tất cả đã đọc', data: result });
  } catch (err) {
    console.error('Error in markAllAsRead:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// DELETE /notifications/:id - Xóa thông báo (chỉ được xóa khi đã đọc)
controller.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting notification:', id);
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ msg: 'Không tìm thấy thông báo', data: null });
    }
    
    if (!notification.is_read) {
      return res.status(400).json({ msg: 'Chỉ có thể xóa thông báo đã đọc', data: null });
    }
    
    await Notification.findByIdAndDelete(id);
    console.log('Successfully deleted notification:', id);
    
    res.json({ msg: 'Đã xóa thông báo', data: { id } });
  } catch (err) {
    console.error('Error in deleteNotification:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

// DELETE /notifications/delete-all-read/:userId - Xóa tất cả thông báo đã đọc
controller.deleteAllRead = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Deleting all read notifications for userId:', userId);
    
    const result = await Notification.deleteMany({
      user_id: userId,
      is_read: true
    });
    
    console.log(`Successfully deleted ${result.deletedCount} read notifications`);
    res.json({ 
      msg: `Đã xóa ${result.deletedCount} thông báo đã đọc`, 
      data: { deletedCount: result.deletedCount } 
    });
  } catch (err) {
    console.error('Error in deleteAllRead:', err);
    res.status(400).json({ msg: err.message, data: null });
  }
};

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


module.exports = controller;