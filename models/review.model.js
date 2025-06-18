const mongoose = require('./db');

const ReviewSchema = new mongoose.Schema({
  user_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  content:      { type: String },
  star_rating:  { type: Number, min: 1, max: 5 },
  review_date:  { type: Date,   default: Date.now },
  image:        { type: String }
}, {
  collection: 'reviews'
});

module.exports = mongoose.model('Review', ReviewSchema);
