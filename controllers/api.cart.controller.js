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