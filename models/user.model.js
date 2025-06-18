const mongoose = require('./db');
const UserSchema = new mongoose.Schema({
  name:       { type: String,  required: true },
  email:      { type: String,  required: true, unique: true },
  phone:      { type: String,  required: true },
  is_lock:    { type: Boolean, default: false },
  created_at: { type: Date,    default: Date.now },
  updated_at: { type: Date,    default: Date.now },
  address_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' }
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
module.exports = mongoose.model('User', UserSchema);
