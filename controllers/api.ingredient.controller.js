const Base = require('./base.controller');
const Ingredient = require('../models/ingredient.model');
module.exports = Base(Ingredient);
