const mongoose = require('./db');

const AddressSchema = new mongoose.Schema({
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ward:           { type: String },
  district:       { type: String },
  city:           { type: String },
  detail_address: { type: String },
  latitude:       { type: String },
  longitude:      { type: String },
  isDefault:      { type: Boolean, default: false },
}, {
  collection: 'addresses'
});

module.exports = mongoose.model('Address', AddressSchema);
