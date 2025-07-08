const mongoose = require('./db');

const ShipmentSchema = new mongoose.Schema({
  order_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  carrier:     { type: String, required: true },
  trackingCode:{ type: String, required: true },
  shippedDate: { type: Date,   default: Date.now },
  status:      { type: String, enum: ['Đang giao','Hoàn thành'], default: 'Đang giao' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  collection: 'shipments',
  timestamps: true
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
