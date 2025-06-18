const Base = require('./base.controller');
const OrderDetail = require('../models/orderDetail.model');
module.exports = Base(OrderDetail);
