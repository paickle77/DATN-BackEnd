const Base = require('./base.controller');
const Favorite = require('../models/favorite.model');
module.exports = Base(Favorite);


module.exports.GetFavoriteandNameProduct = async (req, res) => {
  try {
    const { accountId } = req.params;

    const favorites = await Favorite.find({ Account_id: accountId })
      .populate('product_id')
      .exec();

    if (!favorites || favorites.length === 0) {
      return res.status(200).json({ msg: 'No favorites found', data: [] });
    }

    // Lọc bỏ các favorite có product_id null hoặc undefined (sản phẩm đã bị xóa)
    const validFavorites = favorites.filter(favorite => favorite.product_id != null);

    // Nếu có favorite không hợp lệ, tự động xóa khỏi database
    const invalidFavoriteIds = favorites
      .filter(favorite => favorite.product_id == null)
      .map(favorite => favorite._id);

    if (invalidFavoriteIds.length > 0) {
      await Favorite.deleteMany({ _id: { $in: invalidFavoriteIds } });
      console.log(`Đã xóa ${invalidFavoriteIds.length} favorite không hợp lệ`);
    }

    // Trả về danh sách yêu thích với thông tin sản phẩm đầy đủ
    const data = validFavorites.map(favorite => ({
      _id: favorite._id,
      Account_id: favorite.Account_id,
      product_id: favorite.product_id
    }));

    res.json({ msg: 'OK', data });
  } catch (err) {
    console.error('Lỗi trong GetFavoriteandNameProduct:', err);
    res.status(500).json({ msg: err.message, data: [] });
  }
};

module.exports.GetFavoriteandNameProduct2 = async (req, res) => {
  try {
    const data = await Favorite.find()
      .populate('product_id', '')
      .exec();

    // Lọc bỏ các favorite có product_id null
    const validData = data.filter(favorite => favorite.product_id != null);

    res.json({ msg: 'OK', data: validData });
  } catch (err) {
    console.error('Lỗi trong GetFavoriteandNameProduct2:', err);
    res.status(500).json({ error: err.message });
  }
};

