const Base = require('./base.controller');
const Favorite = require('../models/favorite.model');
module.exports = Base(Favorite);


module.exports.GetFavoriteandNameProduct = async (req, res) => {
  try {
    const { user_id } = req.params;

    const favorite = await Favorite.findOne({ user_id })
      .populate('product_id', 'name');  // chỉ lấy field name

    if (!favorite) {
      return res.status(404).json({ msg: 'Favorite not found', data: null });
    }

    // Chuyển product_id từ object thành mảng tên
    const data = {
      _id: favorite._id,
      user_id: favorite.user_id,
      product_names: favorite.product_id.map(p => p.name)
    };

    res.json({ msg: 'OK', data });
  } catch (err) {
    res.status(500).json({ msg: err.message, data: null });
  }
};

module.exports.GetFavoriteandNameProduct2= async (req,res)=>{
  try{
    const data =await Favorite.find()
    .populate('product_id', '')
    .exec();
   res.json({ msg: 'OK', data: data })
  }catch(err){
    res.status(500).json({error: err.message});
  }
}
