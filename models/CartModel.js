var db = require('./db');


const CartSchema = new db.mongoose.Schema({
  customerID: {
    type: String,
    required: true,
  },
  productID: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
}, {
  collection: 'Cart',
});

const CartModel =  db.mongoose.model('Cart', CartSchema);

module.exports = { CartModel };
