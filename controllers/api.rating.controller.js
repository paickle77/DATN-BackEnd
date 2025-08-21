const Review = require('../models/review.model');

// API tối ưu để lấy rating summary cho nhiều sản phẩm cùng lúc
module.exports.getBatchRatings = async (req, res) => {
  try {
    const { productIds } = req.body; // Array của product IDs
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        msg: 'Product IDs array is required', 
        data: {} 
      });
    }

    // Aggregate để tính rating cho multiple products cùng lúc
    const ratings = await Review.aggregate([
      {
        $match: {
          product_id: { $in: productIds.map(id => require('mongoose').Types.ObjectId(id)) },
          star_rating: { $exists: true, $gte: 1, $lte: 5 }
        }
      },
      {
        $group: {
          _id: '$product_id',
          averageRating: { $avg: '$star_rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const ratingsMap = {};
    ratings.forEach(rating => {
      ratingsMap[rating._id.toString()] = {
        averageRating: Math.round(rating.averageRating * 10) / 10,
        totalReviews: rating.totalReviews
      };
    });

    // Ensure all requested products have a rating (default 0)
    productIds.forEach(productId => {
      if (!ratingsMap[productId]) {
        ratingsMap[productId] = {
          averageRating: 0,
          totalReviews: 0
        };
      }
    });

    res.json({ 
      msg: 'OK', 
      data: ratingsMap 
    });

  } catch (err) {
    console.error('Error in getBatchRatings:', err);
    res.status(500).json({ error: err.message });
  }
};

// API để lấy rating cho một sản phẩm
module.exports.getProductRating = async (req, res) => {
  try {
    const { productId } = req.params;

    const rating = await Review.aggregate([
      {
        $match: {
          product_id: require('mongoose').Types.ObjectId(productId),
          star_rating: { $exists: true, $gte: 1, $lte: 5 }
        }
      },
      {
        $group: {
          _id: '$product_id',
          averageRating: { $avg: '$star_rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const result = rating.length > 0 
      ? {
          averageRating: Math.round(rating[0].averageRating * 10) / 10,
          totalReviews: rating[0].totalReviews
        }
      : {
          averageRating: 0,
          totalReviews: 0
        };

    res.json({ 
      msg: 'OK', 
      data: result 
    });

  } catch (err) {
    console.error('Error in getProductRating:', err);
    res.status(500).json({ error: err.message });
  }
};
