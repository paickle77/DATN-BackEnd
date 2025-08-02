const mongoose = require('./db');

const ShipperSchema = new mongoose.Schema({
  account_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  full_name:      { type: String },
  phone:          { type: String },
  license_number: { type: String },
  vehicle_type:   { type: String },
  is_online:      { type: Boolean, default: false },
}, {
  collection: 'shippers',
  timestamps: true
});

module.exports = mongoose.model('Shipper', ShipperSchema);
