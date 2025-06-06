var express = require('express');
const mongoose = require('mongoose');
var router = express.Router();

mongoose.connect('mongodb+srv://hoangnkph49274:hoangnkph49274@cluster0.oo4stsk.mongodb.net/DATN_CakeShop?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false, collection: 'product' }));

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});



module.exports = router;
