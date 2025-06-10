var dataRes = {msg: 'OK'};
const {PaymentModel} = require('../models/PaymentModel');

exports.getList = async (req, res) => {
    try {
        const products = await PaymentModel.find();
        dataRes.data = products;
        res.json(dataRes);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}
