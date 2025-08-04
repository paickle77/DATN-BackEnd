const mongoose = require('./db');

const UserSchema = new mongoose.Schema({
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  name:       { type: String },
  phone:      { type: String },
  image:      { type: String },
  address_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', UserSchema);
