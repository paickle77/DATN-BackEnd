const mongoose = require('./db');

const ShipperSchema = new mongoose.Schema({
  account_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  full_name:      { type: String },
  phone:          { type: String },
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

module.exports = mongoose.model('Shipper', ShipperSchema);
