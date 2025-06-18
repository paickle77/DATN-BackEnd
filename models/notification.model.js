const mongoose = require('./db');

const NotificationSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:    { type: String, required: true },
  is_read:    { type: Boolean, default: false }
}, {
  collection: 'notifications',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.model('Notification', NotificationSchema);
