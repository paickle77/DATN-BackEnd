const mongoose = require('./db');

const AccountSchema = new mongoose.Schema({
  email:       { type: String, required: true, unique: true },
  password:    { type: String },
  role:        { type: String, enum: ['user', 'shipper', 'admin'], default: 'user' },
  is_lock:     { type: Boolean, default: false },
  lock_reason: { type: String, default: null },
  lock_date:   { type: Date, default: null },
  unlock_date: { type: Date, default: null },
  provider:    { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  google_id:   { type: String, default: null },
  facebook_id: { type: String, default: null },
  otp:         { type: String, default: null },
  otpExpires:  { type: Date, default: null },
}, {
  collection: 'accounts',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ✅ THÊM: Indexes để tối ưu performance cho web admin (Chỉ giữ lại các index cần thiết)
AccountSchema.index({ email: 1 });
AccountSchema.index({ role: 1 });
AccountSchema.index({ is_lock: 1 });
AccountSchema.index({ provider: 1 });
AccountSchema.index({ google_id: 1 }, { sparse: true });
AccountSchema.index({ facebook_id: 1 }, { sparse: true });
AccountSchema.index({ otp: 1, otpExpires: 1 }, { sparse: true });

// ✅ THÊM: Virtual để kiểm tra account có bị khóa không
AccountSchema.virtual('isActive').get(function() {
  return !this.is_lock;
});

// ✅ THÊM: Method để kiểm tra role (cho web admin)
AccountSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

AccountSchema.methods.isUser = function() {
  return this.role === 'user';
};

AccountSchema.methods.isShipper = function() {
  return this.role === 'shipper';
};

// ✅ THÊM: Pre-save middleware để validate
AccountSchema.pre('save', function(next) {
  // Nếu là Google/Facebook login thì không cần password
  if ((this.provider === 'google' && this.google_id) || 
      (this.provider === 'facebook' && this.facebook_id)) {
    this.password = undefined;
  }
  
  // Nếu là local login thì phải có password
  if (this.provider === 'local' && !this.password && this.isNew) {
    const error = new Error('Password is required for local accounts');
    return next(error);
  }
  
  next();
});

// ✅ THÊM: Static method để tìm account theo email hoặc social ID
AccountSchema.statics.findByEmailOrSocialId = function(email, google_id, facebook_id) {
  const query = {
    $or: [{ email: email }]
  };
  
  if (google_id) {
    query.$or.push({ google_id: google_id });
  }
  
  if (facebook_id) {
    query.$or.push({ facebook_id: facebook_id });
  }
  
  return this.findOne(query);
};

// ✅ THÊM: Static method để lấy thống kê accounts cho web admin
AccountSchema.statics.getAccountStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total_accounts: { $sum: 1 },
        active_accounts: {
          $sum: { $cond: [{ $eq: ['$is_lock', false] }, 1, 0] }
        },
        locked_accounts: {
          $sum: { $cond: [{ $eq: ['$is_lock', true] }, 1, 0] }
        },
        local_accounts: {
          $sum: { $cond: [{ $eq: ['$provider', 'local'] }, 1, 0] }
        },
        google_accounts: {
          $sum: { $cond: [{ $eq: ['$provider', 'google'] }, 1, 0] }
        },
        facebook_accounts: {
          $sum: { $cond: [{ $eq: ['$provider', 'facebook'] }, 1, 0] }
        },
        admin_accounts: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        },
        user_accounts: {
          $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
        },
        shipper_accounts: {
          $sum: { $cond: [{ $eq: ['$role', 'shipper'] }, 1, 0] }
        }
      }
    }
  ]);
};

// ✅ THÊM: Static method để tìm accounts với phân trang cho web admin
AccountSchema.statics.findWithPagination = function(filter = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return Promise.all([
    this.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    this.countDocuments(filter)
  ]).then(([accounts, total]) => ({
    accounts,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  }));
};

// ✅ Ensure virtual fields are serialized
AccountSchema.set('toJSON', { virtuals: true });
AccountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Account', AccountSchema);



