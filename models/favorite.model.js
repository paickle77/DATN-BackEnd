const mongoose = require('./db');

const FavoriteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }]
}, {
  collection: 'favorites'  // Đây là options, không phải field!
});

module.exports = mongoose.model('Favorite', FavoriteSchema);
