const Base = require('./base.controller');
const Order = require('../models/order.model');
module.exports = Base(Order);


module.exports.GetAllOrder= async (req,res)=>{
 try {
    const data = await Order.find()
      .populate('user_id')
      .populate('address_id')
      .populate('voucher_id')
      .exec();

    res.json({ msg: 'OK', data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}