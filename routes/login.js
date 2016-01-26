var express = require('express');
var debug = require('debug')('expenses:server');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user.js');

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login', {});
});

router.post('/', passport.authenticate('local'), function(req, res, next) {
  debug(req.body);
  res.redirect('/');
  //res.render('', {});
});

module.exports = router;
