const Base       = require('./base.controller');
const User       = require('../models/user.model');
module.exports   = Base(User);
