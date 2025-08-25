// models/notification.model.js - MINIMAL CHANGES để tương thích
const mongoose = require('./db');

const NotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  //------------------update Fix web admin---------------------
  //-----------------Kết thúc Fix web admin---------------------
  content: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  title: {
    type: String,
    maxlength: 100,
    trim: true,
    default: '' // Tương thích với code cũ
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true // Tối ưu query filter
  },
  icon: {
    type: String,
    default: 'notifications'
  },
  type: {
    type: String,
    enum: ['global', 'personal'],
    default: 'personal',
    index: true
  },
  // 🆕 THÊM FIELD MỚI - Lưu admin tạo thông báo (optional)
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Hoặc ref: 'Account' tùy theo model bạn dùng
    required: false, // ⚠️ QUAN TRỌNG: không required để tương thích mobile app cũ
    default: null
  }
}, {
  collection: 'notifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ type: 1, created_at: -1 });

// 🔥 Pre-save middleware để tự động tạo title (giữ logic cũ)
NotificationSchema.pre('save', function(next) {
  // Auto-generate title nếu chưa có
  if (!this.title && this.content) {
    this.title = this.content.length > 50 
      ? this.content.slice(0, 50) + '…' 
      : this.content;
  }
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);