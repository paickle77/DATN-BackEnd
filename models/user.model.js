const mongoose = require('./db');
const UserSchema = new mongoose.Schema({
   name:       { type: String },
  email:      { type: String, unique: true },
  phone:      { type: String },
  is_lock:    { type: Boolean, default: false },
  role:       { type: String, enum: ['user','admin'], default: 'user' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  address_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  password:   { type: String }, 
  image:      { type: String }, 
  isDefault:  { type: Boolean, default: false },

   // Các trường đăng nhập mạng xã hội
  provider:    { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  google_id:   { type: String, default: null },
  facebook_id: { type: String, default: null },
  otp:        { type: String },                        // ✅ thêm OTP
  otpExpires: { type: Date },
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
module.exports = mongoose.model('User', UserSchema);
