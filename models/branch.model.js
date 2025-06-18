const mongoose = require('./db');

const BranchSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  address: { type: String, required: true },
  phone:   { type: String, required: true }
}, {
  collection: 'branches'
});

module.exports = mongoose.model('Branch', BranchSchema);
