var db = require('./db');


const ReviewSchema = new db.mongoose.Schema({
  customerID: {
    type: String,
    required: true,
  },
  productID: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
    starRating: {
    type: Number,
    required: true,
  },
     reviewDate: {
    type: Date,
    required: true,
  },
      image: {
    type: String,
    required: true,
  },
}, {
  collection: 'Reviews',
});

const ReviewModel =  db.mongoose.model('Reviews', ReviewSchema);

module.exports = { ReviewModel };
