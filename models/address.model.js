const mongoose = require('./db');

const AddressSchema = new mongoose.Schema({
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  street:         { type: String, required: true },
  ward:           { type: String, required: true },
  district:       { type: String, required: true },
  city:           { type: String, required: true },
  detail_address: { type: String }
}, {
  collection: 'addresses'
});

module.exports = mongoose.model('Address', AddressSchema);
