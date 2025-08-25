const mongoose = require('./db');

const UserSchema = new mongoose.Schema({
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  name:       { type: String },
  phone:      { type: String },
  
  // ✅ THÊM: Các field cần thiết cho web admin (không bắt buộc để mobile app vẫn hoạt động)
  gender:     { type: String, enum: ['male', 'female', 'other'], default: null },
  birth_date: { type: Date, default: null },
  avatar:     { type: String, default: 'avatarmacdinh.png' }, // Có default value
  
  // ✅ GIỮ NGUYÊN: Field image cho mobile app (backward compatibility)
  image:      { type: String }, // Mobile app có thể vẫn dùng field này
  
  address_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  // ✅ THÊM: Các field cần thiết cho web admin (không bắt buộc để mobile app vẫn hoạt động)
  gender:     { type: String, enum: ['nam', 'nữ', 'khác'], default: null },
  birth_date: { type: Date, default: null },
  avatar:     { type: String, default: 'avatarmacdinh.png' },
  // ✅ THÊM: Các field cần thiết cho web admin (không bắt buộc để mobile app vẫn hoạt động)
  role:       { type: String, enum: ['user', 'customer'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  last_login: { type: Date, default: null }
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ✅ THÊM: Indexes để tối ưu performance cho web admin
UserSchema.index({ account_id: 1 });
UserSchema.index({ name: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ gender: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ created_at: -1 });

// ✅ THÊM: Virtual fields cho web admin
UserSchema.virtual('fullInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    gender: this.gender,
    birth_date: this.birth_date,
    avatar: this.avatar || this.image, // Fallback to image nếu không có avatar
    hasAddress: !!this.address_id
  };
});

// ✅ THÊM: Instance methods cho web admin  
UserSchema.methods.getAge = function() {
  if (!this.birth_date) return null;
  const today = new Date();
  const birthDate = new Date(this.birth_date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

UserSchema.methods.getDisplayAvatar = function() {
  return this.avatar || this.image || 'avatarmacdinh.png';
};

// ✅ THÊM: Pre-save middleware để đồng bộ avatar và image
UserSchema.pre('save', function(next) {
  // Nếu có avatar mới thì cập nhật image (để mobile app vẫn hoạt động)
  if (this.avatar && this.avatar !== 'avatarmacdinh.png') {
    this.image = this.avatar;
  }
  
  // Nếu chỉ có image thì cập nhật avatar
  if (!this.avatar && this.image) {
    this.avatar = this.image;
  }
  
  next();
});

// ✅ THÊM: Static methods cho web admin
UserSchema.statics.findByAccountId = function(account_id) {
  return this.findOne({ account_id });
};

UserSchema.statics.findUsersWithAccounts = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'accounts',
        localField: 'account_id',
        foreignField: '_id',
        as: 'account'
      }
    },
    {
      $unwind: { path: '$account', preserveNullAndEmptyArrays: true }
    },
    {
      $lookup: {
        from: 'addresses',
        localField: 'address_id', 
        foreignField: '_id',
        as: 'address'
      }
    },
    {
      $unwind: { path: '$address', preserveNullAndEmptyArrays: true }
    }
  ]);
};

UserSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total_users: { $sum: 1 },
        male_users: { $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] } },
        female_users: { $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] } },
        verified_users: { $sum: { $cond: [{ $eq: ['$is_verified', true] }, 1, 0] } },
        users_with_address: { $sum: { $cond: [{ $ne: ['$address_id', null] }, 1, 0] } }
      }
    }
  ]);
};

// ✅ THÊM: Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);