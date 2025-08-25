const mongoose = require('./db');
const Schema = mongoose.Schema;

const ReviewSchema = new mongoose.Schema({
  Account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  bill_id:    { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  billDetail_id: { type: Schema.Types.ObjectId, ref: 'BillDetail', required: true }, // 👈 thêm dòng này
  content:    { type: String },
  star_rating:{ type: Number, min: 1, max: 5 },
  review_date:{ type: Date, default: Date.now },
  image:      { type: String }
}, {
  collection: 'reviews'
});

module.exports = mongoose.model('Review', ReviewSchema);
