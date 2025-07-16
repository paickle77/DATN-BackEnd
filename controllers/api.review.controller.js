const Base = require('./base.controller');
const Review = require('../models/review.model');
module.exports = Base(Review);


module.exports.GetAllReview = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('product_id')
      .exec();

    res.json({ msg: 'OK', data: reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
