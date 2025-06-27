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
  isDefaul:   { type: Boolean, default: false },
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
module.exports = mongoose.model('User', UserSchema);
