// app.js
require('dotenv').config();           // load .env trước tiên
var createError = require('http-errors');
var express     = require('express');
var path        = require('path');
var cookieParser= require('cookie-parser');
var logger      = require('morgan');
const cors = require('cors')

// *** Chỉ cần 2 router “view” ***
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter   = require('./routes/api');

// *** Và 1 router duy nhất cho API CRUD ***
var apiRouter   = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// Cấu hình CORS
app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);


// ** Dùng duy nhất cái này **
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error   = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
