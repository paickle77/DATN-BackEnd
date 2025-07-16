const Base = require('./base.controller');
const Bill = require('../models/bill.model');
module.exports = Base(Bill);


module.exports.GetAllBils= async (req,res)=>{
 try {
    const data = await Bill.find()
      .populate('user_id')
      .populate('address_id')
    //   .populate('voucher_id')
      .exec();

    res.json({ msg: 'OK', data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}