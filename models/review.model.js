const mongoose = require('./db');
const Schema = mongoose.Schema;

const ReviewSchema = new mongoose.Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  product_id:   { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  content:      { type: String },
  star_rating:  { type: Number, min: 1, max: 5 },
  review_date:  { type: Date,   default: Date.now },
  image:        { type: String }
}, {
  collection: 'reviews'
});

module.exports = mongoose.model('Review', ReviewSchema);
