var dataRes = {msg: 'OK'};
const {FavoriteModel} = require('../models/FavoriteModel');

exports.getList = async (req, res) => {
    try {
        const products = await FavoriteModel.find();
        dataRes.data = products;
        res.json(dataRes);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}
