var db = require('./db');


const OrderSchema = new db.mongoose.Schema({
  customerID: {
    type: String,
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
  },
   totalAmount: {
    type: Number,
    required: true,
  },
    status: {
    type: String,
    required: true,
  },
    address: {
    type: String,
    required: true,
  },
}, {
  collection: 'Orders',
});

const OrderModel =  db.mongoose.model('Orders', OrderSchema);

module.exports = { OrderModel };
