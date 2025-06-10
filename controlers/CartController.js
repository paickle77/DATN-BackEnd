var dataRes = {msg: 'OK'};
const {CartModel} = require('../models/CartModel');

exports.getList = async (req, res) => {
    try {
        const products = await CartModel.find();
        dataRes.data = products;
        res.json(dataRes);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}
