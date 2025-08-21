const mongoose = require('./db');
const Schema = mongoose.Schema;

const FavoriteSchema = new Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, {
  collection: 'favorites'  // Đây là options, không phải field!
});

module.exports = mongoose.model('Favorite', FavoriteSchema);
