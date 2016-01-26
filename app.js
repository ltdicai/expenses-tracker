var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var debug = require('debug')('expenses:server');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
//debug("app.js");

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/expenses');

var passport = require('passport');

var routes = require('./routes/index');
//var users = require('./routes/users');
var api = require("./routes/api");
//var login = require("./routes/login");

var app = express();

// Define Session storage in MongoDB
var store = new MongoDBStore({
  uri: 'mongodb://localhost/expenses',
  collection: 'session'
});

// Error handler for Session storage
store.on('error', function(err){
  debug("Datastore error");
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// Log all requests
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// Session support
app.use(session({
  secret: "Easter",
  resave: false,
  saveUninitialized: false,
  store: store // Store in MongoDB
}));
// Use Passport authentication
app.use(passport.initialize());
app.use(passport.session());
// Serve static content
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', routes);
//app.use('/users', users);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
