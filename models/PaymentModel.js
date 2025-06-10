var db = require('./db');


const PaymentSchema = new db.mongoose.Schema({
  orderID: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
    paymentDate: {
    type: Date,
    required: true,
  },
}, {
  collection: 'Payments',
});

const PaymentModel =  db.mongoose.model('Payments', PaymentSchema);

module.exports = { PaymentModel };
