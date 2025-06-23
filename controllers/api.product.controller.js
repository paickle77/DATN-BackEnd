const Base = require('./base.controller');
const Product = require('../models/product.model');
module.exports = Base(Product);

// Nếu bạn cần các API đặc thù như tìm theo category hoặc search,
// bạn vẫn có thể thêm method bên dưới rồi export cùng:
module.exports.GetListByCategory = async (req, res) => {
  try {
    const list = await Product.find({ category_id: req.params.id });
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
module.exports.SearchByName = async (req, res) => {
  try {
    const regex = new RegExp(req.query.q, 'i');
    const list = await Product.find({ name: regex });
    res.json({ msg: 'OK', data: list });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports.getProductAndCategoryName= async (req,res)=>{
 try {
    const products = await Product.find()
      .populate('category_id', 'name')
      .populate('ingredient_id', 'name')
      .exec();

    res.json({ msg: 'OK', data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports.getProductAndIngredientName= async (req,res)=>{
  try{
    const products =await Product.find()
    .populate('ingredient_id', 'name')
    .exec();
   res.json({ msg: 'OK', data: products })
  }catch(err){
    res.status(500).json({error: err.message});
  }
}
