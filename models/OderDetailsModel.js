var db = require('./db');


const OderDetailSchema = new db.mongoose.Schema({
  orderID: {
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
  subtotal: {
    type: Number,
    required: true,
  },
}, {
  collection: 'OrderDetails',
});

const OderDetailModel =  db.mongoose.model('OrderDetails', OderDetailSchema);

module.exports = { OderDetailModel };
