// models/shipment.model.js
const mongoose = require('mongoose');
const ShipmentSchema = new mongoose.Schema({
  bill_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true
  },
  carrier:      String,
  trackingCode: String,
  shippedDate:  Date,
  status: {
    type: String,
    enum: ['doing','shipping','done'],
    default: 'doing'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
},{
  timestamps: true
});
module.exports = mongoose.model('Shipment', ShipmentSchema);
