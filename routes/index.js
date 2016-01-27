var express = require('express');
var router = express.Router();
var passport = require('passport');
var debug = require('debug')('expenses:server');
var User = require('../models/user.js');
var Entry = require('../models/entry.js');
var ensureAuth = require('../helpers/auth.js');
var dateFormat = require('dateformat');
var form = require('express-form');


function convertDate(str){
  if(str == "") return null;
  if(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(str)){
    var parts = str.split(/[-\/]/);
    if(parts[1].length == 1){
      parts[1] = "0" + parts[1];
    }
    if(parts[0].length == 1){
      parts[0] = "0" + parts[0];
    }
    var aux = [parts[2], parts[1], parts[0]];
    // debug(aux);
    return new Date(aux.join("-"));
  }
  else{
    return null;
  }
}

// Auth strategy
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* GET home page. */
router.get('/', ensureAuth, function(req, res, next){
  res.redirect('/dashboard');
});

// Sign up screen
router.get('/signup', function(req, res, next) {
  res.render('signup', {title: "Sign up"});
});

router.post('/signup', function(req, res, next) {
  User.register(
    new User({username: req.body.username}), req.body.password, function(err) {
      if (err) {
        debug('error with signup');
        return next(err);
      }
      debug('New user ' + req.body.username);
      res.redirect('/');
    }
  );
});

// Login screen
router.get('/login', function(req, res, next) {
  if (req.user){
    res.redirect('/');
  }
  else{
    res.render('login', {});
  }
});

router.post('/login', passport.authenticate('local'), function(req, res, next) {
  res.redirect('/');
});

// Logout endpoint
router.get('/logout', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

// Main screen
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


// Entry create or update screen
router.get('/entry', ensureAuth, function(req, res, next) {
  if(!req.query.eid){
    return res.render('entry_form', {title: "Add entry - Expenses", dateFormat: dateFormat})
  }
  Entry.findOne({_id: req.query.eid}, function(err, doc){
    if(err) return debug(err);
    res.render('entry_form', {
      title: "Edit entry - Expenses", 
      entry: doc, 
      dateFormat: dateFormat
    })
  });
});

router.post('/entry', ensureAuth, form(
    form.field('date').required().trim().custom(function(value){
      return convertDate(value);
    }),
    form.field('time').trim().ifNull('00:00').is(/[0-2][0-9]:[0-5][0-9]/, 'Invalid time'),
    form.field('description').required().trim(),
    form.field('amount').required().trim().toFloat(),
    form.field('comment').trim()
  ),
  function(req, res, next) {
    if(!req.form.isValid){
      return res.json({"status": "error", "message": req.form.errors});
    }
    else{
      var datetime = req.form.date;
      var time = req.form.time.split(":");
      //Get UTC time
      datetime.setTime(datetime.getTime() + datetime.getTimezoneOffset()*60*1000);
      datetime.setHours(time[0], time[1]);
      var params = {
        datetime: datetime,
        description: req.form.description,
        amount: req.form.amount,
        comment: req.form.comment,
        user: req.user._id
      }
      // If updating entry
      if (req.query.eid){
        Entry.update({_id: req.query.eid, user: req.user._id}, {'$set': params}, function(err){
          if(err) return next(err);
          res.json({"status": "ok"});
        });
      }
      else{
        Entry.create(params, function(err, entry){
          if(err) return next(err);
          res.json({"status": "ok"});
        });
      }
    }
  }
);

router.get('/delete_entry', ensureAuth, function(req, res, next) {
  if(!req.query.eid){
    return debug("No eid");
  }
  Entry.remove({_id:req.query.eid, user: req.user._id}, function(err){
    if(err) return next(err);
    res.json({"status": "ok"})
  });
});

router.get('/summary', ensureAuth, function(req, res, next){
  var obj = {};
  obj.map = function(){  
    var getWeek = function(d) {
      /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */
      dowOffset = 1;
      var newYear = new Date(d.getFullYear(),0,1);
      var day = newYear.getDay() - dowOffset;
      day = (day >= 0 ? day : day + 7);
      var daynum = Math.floor((d.getTime() - newYear.getTime() - (d.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
      var weeknum;
      if (day < 4) {
          weeknum = Math.floor((daynum+day-1)/7) + 1;
          if(weeknum > 52) {
              nYear = new Date(d.getFullYear() + 1,0,1);
              nday = nYear.getDay() - dowOffset;
              nday = nday >= 0 ? nday : nday + 7;
              weeknum = nday < 4 ? 1 : 53;
          }
      } else {
          weeknum = Math.floor((daynum+day-1)/7);
      }
      return weeknum;
    };
    if(this.user == user_id){
      emit(getWeek(this.datetime), {amount: this.amount, count: 1});
    }
  }

  obj.reduce = function(key, values){
    var acum = {amount: 0, count: 0}; 
    for(var idx = 0; idx < values.length; ++idx){
      var item = values[idx];
      acum.amount += item.amount;
      acum.count += item.count;
    }
    return acum;
  }
  obj.finalize = function(key, reducedVal){
    reducedVal.avg = reducedVal.amount/reducedVal.count;
    return reducedVal;
  }
  obj.scope = {user_id: String(req.user._id), dateFormat: dateFormat};
  Entry.mapReduce(obj, function(err, results){
    if (err){
      debug(err);
      return res.json({"status": "error", "message": "Error when collecting data"});
    }
    results.sort(function(a,b){
      return a._id - b._id;
    });
    if(req.query.json){
      return res.json({"status":"ok", "results": results});
    }
    res.render('summary', {entries: results});
  });
});

router.get('/showall', ensureAuth, function(req, res, next) {
  var qry = {user: req.user._id};
  if(req.query.from || req.query.to){
    qry.datetime = {};
    if(req.query.from){
      qry.datetime['$gte'] = new Date(req.query.from);
    }
    if(req.query.to){
      qry.datetime['$lte'] = new Date(req.query.to);
    }
  }
  // debug(qry);
  Entry.find(qry, function(err, docs){
    return res.render('dashboard_table', {entries: docs, dateFormat: dateFormat});
  });
});

module.exports = router;
