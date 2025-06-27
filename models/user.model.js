const mongoose = require('./db');
const UserSchema = new mongoose.Schema({
   name:       { type: String }, // ❌ bỏ required
  email:      { type: String, unique: true }, // ❌ bỏ required
  phone:      { type: String }, // ❌ bỏ required
  is_lock:    { type: Boolean, default: false },
  role:       { type: String, enum: ['user','admin'], default: 'user' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  address_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  password:   { type: String }, // ❌ bỏ required
  image:      { type: String }, // ❌ bỏ required
  isDefault:  { type: Boolean, default: false },

   // Các trường đăng nhập mạng xã hội
  provider:    { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  google_id:   { type: String, default: null },
  facebook_id: { type: String, default: null }
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
module.exports = mongoose.model('User', UserSchema);
