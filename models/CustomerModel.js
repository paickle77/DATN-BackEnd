var db = require('./db');


const CustomerSchema = new db.mongoose.Schema({
  CustomerID: {
    type: String,
    required: true,
  },
  Email: {
    type: String,
    required: true,
  },
    CustomerName: {
    type: String,
    required: true,
  },
    PhoneNumber: {
    type: String,
    required: true,
  },
  Address: {
    type: String,
    required: true,
  },
  Password: {
    type: String,
    required: true,
  },
  Gender: {
    type: Number,
    required: true,
  },
  Image: {
    type: Number,
    required: true,
  },
}, {
  collection: 'Customers',
});

const CustomerModel =  db.mongoose.model('Customers', CustomerSchema);

module.exports = { CustomerModel };
