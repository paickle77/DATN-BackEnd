var db = require('./db');


const ProductSchema = new db.mongoose.Schema({
  ProductID: {
    type: String,
    required: true,
  },
  ProductName: {
    type: String,
    required: true,
  },
  Price: {
    type: Number,
    required: true,
  },
  Description: {
    type: String,
    required: true,
  },
  Image: {
    type: String,
    required: true,
  },
  Rating: {
    type: Number,
    required: true,
  },
  Stock: {
    type: Number,
    required: true,
  },
  CategoryID: {
    type: String,
    required: true,
  },
}, {
  collection: 'Product',
});

const ProductModel = db.mongoose.models.Product || db.mongoose.model('Product', ProductSchema);

module.exports = { ProductModel };
