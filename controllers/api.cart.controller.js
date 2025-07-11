const Base = require('./base.controller');
const Cart = require('../models/cart.model');
module.exports = Base(Cart);


module.exports.GetAllCart=async(req,res)=>{
    try {
        const list= await Cart.find()
        .populate('product_id')
        .populate('size_id','size')
        .exec();

        res.json({msg: "OK ",data :list});
    } catch (error) {
        res.status(500).json({error:error.message})
    }
}


//API xóa toàn bộ giỏ hàng theo user_id
module.exports.DeleteCartByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ msg: 'Thiếu user_id trong URL' });
    }

    const result = await Cart.deleteMany({ user_id });

    res.json({
      msg: `Đã xóa ${result.deletedCount} sản phẩm trong giỏ hàng của user ${user_id}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

