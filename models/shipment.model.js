const mongoose = require('./db');

const ShipmentSchema = new mongoose.Schema({
  order_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  carrier:     { type: String, required: false, default: '' },
  trackingCode:{ type: String, required: false, default: '' },
  shippedDate: { type: Date,   default: Date.now },
  status:      { type: String, enum: ['Đang giao','Hoàn thành'], default: 'Đang giao' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  collection: 'shipments',
  timestamps: true
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
