const mongoose = require('./db');

const ShipperSchema = new mongoose.Schema({
  account_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  full_name:      { type: String, required: true },
  phone:          { type: String, required: true },
  image:         { type: String, default: '' },
  license_number: { type: String },
  vehicle_type:   { type: String },
  is_online:      {  type: String,
    enum: ['offline', 'online', 'busy'],
    default: 'offline' },
}, {
  collection: 'shippers',
  timestamps: true
});

// ✅ THÊM: Pre-save middleware để đảm bảo is_online luôn là boolean hoặc 'busy'
ShipperSchema.pre('save', function(next) {
  // Xử lý is_online
  if (this.is_online === 'true' || this.is_online === 'online') {
    this.is_online = true;
  } else if (this.is_online === 'false' || this.is_online === 'offline') {
    this.is_online = false;
  } else if (this.is_online === 'busy') {
    // Giữ nguyên 'busy'
    this.is_online = 'busy';
  }
  // Nếu là boolean thì giữ nguyên
  
  next();
});

// ✅ THÊM: Pre-update middleware để xử lý khi update
ShipperSchema.pre(['findOneAndUpdate', 'updateOne'], function(next) {
  const update = this.getUpdate();
  
  if (update && update.is_online !== undefined) {
    if (update.is_online === 'true' || update.is_online === 'online') {
      update.is_online = true;
    } else if (update.is_online === 'false' || update.is_online === 'offline') {
      update.is_online = false;
    } else if (update.is_online === 'busy') {
      update.is_online = 'busy';
    }
  }
  
  next();
});

// ✅ THÊM: Virtual để check trạng thái
ShipperSchema.virtual('statusText').get(function() {
  if (this.is_online === 'busy') return 'Đang giao hàng';
  if (this.is_online === true) return 'Online';
  return 'Offline';
});

// ✅ THÊM: Method để update trạng thái online
ShipperSchema.methods.updateOnlineStatus = function(status) {
  if (status === 'busy' || status === true || status === false) {
    this.is_online = status;
    return this.save();
  }
  throw new Error('Invalid online status');
};

// ✅ THÊM: Static method để lấy shipper theo trạng thái
ShipperSchema.statics.getByOnlineStatus = function(status) {
  if (status === 'online') {
    return this.find({ is_online: true });
  } else if (status === 'offline') {
    return this.find({ is_online: false });
  } else if (status === 'busy') {
    return this.find({ is_online: 'busy' });
  }
  return this.find(); // all
};

// ✅ Ensure virtual fields are serialized
ShipperSchema.set('toJSON', { virtuals: true });
ShipperSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Shipper', ShipperSchema);