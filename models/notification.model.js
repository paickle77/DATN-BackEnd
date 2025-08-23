// models/notification.model.js
const mongoose = require('./db');

const NotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'Thông báo mới'
  },
  content: {
    type: String,
    required: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: 'notifications'
  }
}, {
  collection: 'notifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Notification', NotificationSchema);
