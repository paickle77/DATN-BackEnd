const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("🔗 Kết nối CSDL thành công"))
  .catch(err => {
    console.error("❌ Lỗi kết nối CSDL:", err);
    process.exit(1);
  });

module.exports = mongoose;