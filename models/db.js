const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://levanan.8b@gmail.com:levanan.8b@cluster0.oo4stsk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log("✅ Kết nối CSDL MongoDB thành công!");
  })
  .catch((err) => {
    console.log("❌ Lỗi kết nối CSDL:");
    console.log(err);
  });

module.exports = { mongoose };
