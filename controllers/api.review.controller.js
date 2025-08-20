const Base = require('./base.controller');
const Review = require('../models/review.model');
const BillDetail = require('../models/BillDetail.model');
module.exports = Base(Review);

module.exports.GetAllReview = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('product_id')
      .populate('Account_id')
      .exec();

    // Lọc ra những review có product_id và Account_id hợp lệ
    const validReviews = reviews.filter(review => {
      return review.product_id && review.Account_id && review.star_rating;
    });
    
    res.json({ msg: 'OK', data: validReviews });
  } catch (err) {
    console.error('Error in GetAllReview:', err);
    res.status(500).json({ error: err.message });
  }
};

// Check review status cho một bill - xem có sản phẩm nào đã được review chưa
module.exports.checkBillReviewStatus = async (req, res) => {
  try {
    const { billId, accountId } = req.params;

    // Lấy tất cả bill details của bill này
    const billDetails = await BillDetail.find({ 'bill_id': billId })
      .populate('product_id')
      .populate('bill_id')
      .exec();

    if (!billDetails || billDetails.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy chi tiết đơn hàng' });
    }

    // Check trạng thái đơn hàng - chỉ 'done' mới được review
    const billStatus = billDetails[0].bill_id.status;
    const canReviewBill = billStatus === 'done';

    console.log(`✅ Bill ${billId} status: ${billStatus}, canReview: ${canReviewBill}`);

    // Kiểm tra từng sản phẩm trong bill đã được review chưa
    const reviewStatusList = await Promise.all(
      billDetails.map(async (detail) => {
        let productId = null;
        let productName = 'Unknown Product';
        
        // Ưu tiên lấy từ product_id vì đây là reference chính xác
        if (detail.product_id && detail.product_id._id) {
          productId = detail.product_id._id;
          productName = detail.product_id.name;
          console.log(`📦 Product từ product_id: ${productName} (${productId})`);
        } 
        // Nếu không có product_id, lấy từ product_snapshot
        else if (detail.product_snapshot && detail.product_snapshot.name) {
          // Với structure mới, tìm product bằng tên từ snapshot
          const Product = require('../models/product.model');
          console.log(`🔍 Tìm product cho snapshot: ${detail.product_snapshot.name}`);
          
          // Thử tìm bằng tên chính xác trước
          let foundProduct = await Product.findOne({ name: detail.product_snapshot.name });
          
          // Nếu không tìm thấy, thử tìm bằng regex (case insensitive)
          if (!foundProduct) {
            foundProduct = await Product.findOne({ 
              name: { $regex: new RegExp(detail.product_snapshot.name, 'i') }
            });
          }
          
          if (foundProduct) {
            productId = foundProduct._id;
            productName = foundProduct.name;
            console.log(`✅ Tìm thấy product từ snapshot: ${productName} (${productId})`);
          } else {
            console.log(`❌ Không tìm thấy product cho snapshot: ${detail.product_snapshot.name}`);
            // Log tất cả products để debug
            const allProducts = await Product.find({}, 'name').limit(10);
            console.log(`📋 Sample products:`, allProducts.map(p => p.name));
          }
          
          // Nếu vẫn không tìm thấy, dùng tên từ snapshot
          if (!productId) {
            productName = detail.product_snapshot.name;
          }
        }

        if (!productId) {
          console.log(`❌ Không có productId cho detail: ${detail._id}`);
          return {
            billDetailId: detail._id,
            productId: null,
            productName: productName,
            hasReviewed: false,
            reviewId: null,
            canReview: false,
            note: 'Không tìm thấy product ID'
          };
        }

        // Kiểm tra xem sản phẩm này đã được user này review chưa
        const existingReview = await Review.findOne({
          Account_id: accountId,
          product_id: productId
        });

        const hasReviewed = !!existingReview;
        const canReviewProduct = canReviewBill && !hasReviewed;

        console.log(`🔍 Product ${productName}: hasReviewed=${hasReviewed}, canReview=${canReviewProduct}`);

        return {
          billDetailId: detail._id,
          productId: productId.toString(),
          productName: productName,
          hasReviewed: hasReviewed,
          reviewId: existingReview ? existingReview._id : null,
          canReview: canReviewProduct,
          note: hasReviewed ? 'Đã review' : (canReviewBill ? 'Có thể review' : 'Chưa thể review')
        };
      })
    );

    // Tính toán trạng thái tổng thể
    const validProducts = reviewStatusList.filter(item => item.productId !== null);
    const totalProducts = validProducts.length;
    const reviewedProducts = validProducts.filter(item => item.hasReviewed).length;
    const allReviewed = totalProducts > 0 && reviewedProducts === totalProducts;

    console.log(`📊 Tổng kết: ${reviewedProducts}/${totalProducts} đã review, allReviewed=${allReviewed}`);

    res.json({
      msg: 'OK',
      data: {
        billId,
        billStatus,
        canReview: canReviewBill,
        allReviewed,
        totalProducts,
        reviewedProducts,
        products: reviewStatusList
      }
    });

  } catch (err) {
    console.error('Error in checkBillReviewStatus:', err);
    res.status(500).json({ error: err.message });
  }
};

// Kiểm tra xem một sản phẩm cụ thể trong bill đã được review chưa
module.exports.checkProductReviewInBill = async (req, res) => {
  try {
    const { billId, productId, accountId } = req.params;

    // Kiểm tra bill detail có tồn tại không
    const billDetail = await BillDetail.findOne({
      'bill_id': billId,
      $or: [
        { 'product_id': productId },
        // Có thể cần thêm logic cho product_snapshot
      ]
    }).populate('bill_id');

    if (!billDetail) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong đơn hàng này' });
    }

    // Check trạng thái đơn hàng
    const canReview = billDetail.bill_id.status === 'done';

    // Kiểm tra xem đã review chưa
    const existingReview = await Review.findOne({
      Account_id: accountId,
      product_id: productId
    });

    res.json({
      msg: 'OK',
      data: {
        billId,
        productId,
        hasReviewed: !!existingReview,
        reviewId: existingReview ? existingReview._id : null,
        canReview: canReview && !existingReview,
        billStatus: billDetail.bill_id.status
      }
    });

  } catch (err) {
    console.error('Error in checkProductReviewInBill:', err);
    res.status(500).json({ error: err.message });
  }
};

// Test API để debug dữ liệu
module.exports.debugBillDetails = async (req, res) => {
  try {
    const { billId } = req.params;

    const billDetails = await BillDetail.find({ 'bill_id': billId })
      .populate('product_id')
      .populate('bill_id')
      .exec();

    console.log(`🔍 Debug Bill ${billId}:`);
    billDetails.forEach((detail, index) => {
      console.log(`  📦 Item ${index + 1}:`);
      console.log(`    - BillDetail ID: ${detail._id}`);
      console.log(`    - Product ID: ${detail.product_id ? detail.product_id._id : 'null'}`);
      console.log(`    - Product Name: ${detail.product_id ? detail.product_id.name : 'null'}`);
      console.log(`    - Product Snapshot: ${detail.product_snapshot ? JSON.stringify(detail.product_snapshot) : 'null'}`);
      console.log(`    - Bill Status: ${detail.bill_id.status}`);
    });

    res.json({
      msg: 'OK',
      data: {
        billId,
        totalItems: billDetails.length,
        items: billDetails.map(detail => ({
          billDetailId: detail._id,
          hasProductId: !!detail.product_id,
          productIdValue: detail.product_id ? detail.product_id._id : null,
          productName: detail.product_id ? detail.product_id.name : null,
          hasProductSnapshot: !!detail.product_snapshot,
          productSnapshotName: detail.product_snapshot ? detail.product_snapshot.name : null,
          billStatus: detail.bill_id.status
        }))
      }
    });

  } catch (err) {
    console.error('Error in debugBillDetails:', err);
    res.status(500).json({ error: err.message });
  }
};
