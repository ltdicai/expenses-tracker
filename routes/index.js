var express = require('express');
var router = express.Router();
var passport = require('passport');
var debug = require('debug')('expenses:server');
//var Strategy = require('../helpers/auth.js');
var User = require('../models/user.js');
var Entry = require('../models/entry.js');
var ensureAuth = require('../helpers/auth.js');
var dateFormat = require('dateformat');

function convertDate(str){
  if(str == "") return null;
  if(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(str)){
    var parts = str.split(/[-\/]/);
    var aux = [parts[2], parts[1], parts[0]];
    // debug(aux);
    return new Date(aux.join("-"));
  }
  else{
    return null;
  }
}

var form = require('express-form');

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* GET home page. */
router.get('/', ensureAuth, function(req, res, next){
  res.redirect('/dashboard');
});

router.get('/signup', function(req, res, next) {
  debug(req);
  debug(res);
  res.render('signup', {title: "Sign up"});
});

router.post('/signup', function(req, res, next) {
  User.register(
    new User({username: req.body.username}), req.body.password, function(err) {
      if (err) {
        debug('error with signup');
        return next(err);
      }
      debug('Sign up user ' + req.body.username + ' succesfully');
      res.redirect('/');
    }
  );
});

router.get('/login', function(req, res, next) {
  debug(req.user);
  if (req.user){
    res.redirect('/');
  }
  else{
    res.render('login', {});
  }
});

router.post('/login', passport.authenticate('local'), function(req, res, next) {
  debug(req.body);
  res.redirect('/');
});

router.get('/logout', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

router.get('/dashboard', ensureAuth, function(req, res, next) {
  req.user.entries(function(err, docs){
    res.render('dashboard', {
      title: "Expenses",
      user: req.user,
      entries: docs,
      dateFormat: dateFormat
    });
  });
});

router.get('/entry', ensureAuth, function(req, res, next) {
  if(!req.query.eid){
    return res.render('add_entry', {title: "Add entry - Expenses", dateFormat: dateFormat})
  }
  Entry.findOne({_id: req.query.eid}, function(err, doc){
    res.render('add_entry', {
      title: "Edit entry - Expenses", 
      entry: doc, 
      dateFormat: dateFormat
    })
  });
});

router.post('/entry', ensureAuth, form(
    form.field('date').required().trim().custom(function(value){
      debug(value);
      return convertDate(value);
    }),
    form.field('time').trim().ifNull('00:00').is(/[0-2][0-9]:[0-5][0-9]/, 'Invalid time'),
    form.field('description').required().trim(),
    form.field('amount').required().trim().toFloat(),
    form.field('comment').trim()
  ),
  function(req, res, next) {
    // debug(req.body);
    // debug(req.form);
    // debug(req.user._id);
    if(!req.form.isValid){
      res.status(500);
      res.render('error', {
        message: req.form.errors,
        error: {}
      });
    }
    else{
      var datetime = req.form.date;
      var time = req.form.time.split(":")
      datetime.setHours(time[0], time[1]);
      var params = {
        datetime: datetime,
        description: req.form.description,
        amount: req.form.amount,
        comment: req.form.comment,
        user: req.user._id
      }
      if (req.query.eid){
        Entry.update({_id: req.query.eid}, {'$set': params}, function(err){
          if(err) return debug(err);
          res.redirect('/dashboard');
        });
      }
      else{
        Entry.create(params, function(err, entry){
          if(err) return debug(err);
          res.redirect('/dashboard');
        });
      }
    }
  }
);

router.get('/delete_entry', ensureAuth, function(req, res, next) {
  if(!req.query.eid){
    return debug("No eid");
  }
  Entry.remove({_id:req.query.eid}, function(err){
    if(err) return debug(err);
    res.redirect('/dashboard');
  });
});

module.exports = router;
