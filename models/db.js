const mongoose = require('mongoose');


  mongoose.connect('mongodb+srv://hoangnkph49274:hoangnkph49274@cluster0.oo4stsk.mongodb.net/DATN_CakeShop?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('Connected to MongoDB');
  }).catch((err) => {
    console.error('MongoDB connection error:', err);
  });
  
module.exports = { mongoose };
