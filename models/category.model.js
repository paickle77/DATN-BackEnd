const mongoose = require('./db');

const CategorySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String }
}, {
  collection: 'categories'
});

module.exports = mongoose.model('Category', CategorySchema);
