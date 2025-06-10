var db = require('./db');


const FavoriteSchema = new db.mongoose.Schema({
  customerID: {
    type: String,
    required: true,
  },
  productID: {
    type: String,
    required: true,
  },
}, {
  collection: 'Favorites',
});

const FavoriteModel =  db.mongoose.model('Favorites', FavoriteSchema);

module.exports = { FavoriteModel };
