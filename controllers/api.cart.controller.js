const Base = require('./base.controller');
const Cart = require('../models/cart.model');
const Size = require('../models/size.model');
module.exports = Base(Cart);


module.exports.GetAllCart=async(req,res)=>{
    try {
        const list= await Cart.find()
        .populate('product_id')
        .populate('size_id')
        .exec();

        // Lọc bỏ cart không có product hoặc size (null do bị xóa hoặc lỗi DB)
        const validList = list.filter(item => item.product_id && item.size_id);

        // Tự động xóa cart có size_id hoặc product_id bị null (dọn rác DB)
        const invalidCarts = list.filter(item => !item.size_id || !item.product_id);
        const invalidCartIds = invalidCarts.map(item => item._id);

        if (invalidCartIds.length > 0) {
            // Log cảnh báo cho admin/dev
            console.warn(`[CART CLEANUP] ${invalidCartIds.length} cart(s) bị thiếu product hoặc size. Đã tự động xóa. Chi tiết:`, invalidCarts);
            await Cart.deleteMany({ _id: { $in: invalidCartIds } });
        }

        res.json({msg: "OK ",data :validList});
    } catch (error) {
        res.status(500).json({error:error.message})
    }
}


//API xóa toàn bộ giỏ hàng theo user_id
module.exports.DeleteCartByAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({ msg: 'Thiếu accountId trong URL' });
    }

    const result = await Cart.deleteMany({ Account_id: accountId });

    res.json({
      msg: `Đã xóa ${result.deletedCount} sản phẩm trong giỏ hàng của account ${accountId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports.GetCartByAccount = async (req, res) => {
    try {
        const { accountId } = req.params;
        if (!accountId) {
            return res.status(400).json({ msg: 'Thiếu accountId trong URL' });
        }
        const list = await Cart.find({ Account_id: accountId })
            .populate('product_id')
            .populate('size_id')
            .exec();

        const validList = list.filter(item => item.product_id && item.size_id);

        res.json({ msg: "OK", data: validList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

