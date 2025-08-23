// controllers/api.notification.controller.js
const Base = require('./base.controller');
const Notification = require('../models/notification.model');

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

module.exports = controller;
