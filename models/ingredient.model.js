const mongoose = require('./db');

const IngredientSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  unit:           { type: String, required: true },
  stock_quantity: { type: Number, required: true },
  price_per_unit: { type: Number, required: true }
}, {
  collection: 'ingredients',
  timestamps: { updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Ingredient', IngredientSchema);
