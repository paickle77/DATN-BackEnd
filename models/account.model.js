const mongoose = require('./db');

const AccountSchema = new mongoose.Schema({
  email:       { type: String, required: true, unique: true },
  password:    { type: String },
  role:        { type: String, enum: ['user', 'shipper', 'admin'], default: 'user' },
  is_lock:     { type: Boolean, default: false },
  provider:    { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  google_id:   { type: String, default: null },
  facebook_id: { type: String, default: null },
  otp:         { type: String, default: null },
  otpExpires:  { type: Date, default: null },
}, {
  collection: 'accounts',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Account', AccountSchema);

const mongoose = require('./db');

