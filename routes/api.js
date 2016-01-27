var express = require('express');
var router = express.Router();
var debug = require('debug')('expenses:server');
var User = require('../models/user.js');
var Entry = require('../models/entry.js');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var dateFormat = require('dateformat');
var form = require('express-form');

// Convert string dd/mm/yyyy to Date()
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
    return new Date(aux.join("-"));
  }
  else{
    return null;
  }
}

// Auth method for API
passport.use(new BasicStrategy(
  function(username, password, done){
    User.findOne({username: username}, function(err, doc){
      if(err) return done(err);
      if(!doc) return done(null, false);
      doc.authenticate(password, function(err, thisModel, passwordErr){
        if(err) return done(err);
        if(passwordErr) return done(passwordErr);
        if(!thisModel) return done(null, false);
        return done(null, true);
      });
    });
  }
));

// User resource
router.route('/user')
  .get(function(req, res, next){
    if(!req.body.username) return res.json({"status": "error", "message": "No username provided"});
    User.findOne({username: req.body.username}, function(err, doc){
      if (err) return res.json({"status": "error", "message": "User " + req.body.username + "doesn't exists"});
      res.json({"status": "ok"});
    });
  })
  .post(function(req, res, next){
    if(!req.body.username) return res.json({"status": "error", "message": "No username provided"});
    if(!req.body.password) return res.json({"status": "error", "message": "No password provided"});
    User.register(
      new User({username: req.body.username}), req.body.password, function(err) {
        if (err) {
          return res.json({"status": "error", "message": "Couldn't add user"});
        }
        debug('New user ' + req.body.username);
        res.json({"status": "ok"});
      }
    );
  });

// Entry collection resource
router.route('/entries')
  .all(passport.authenticate('basic', {session: false}))
  .get(function(req, res, next){
    Entry.find({username: req.user.username}, function(err, docs){
      if (err) return res.json({"status":"error", "message": "Couldn't get entries"});
      res.json({"status": "ok", "entries": docs});
    })
  });

// Entry resource
router.route('/entry')
  .all(passport.authenticate('basic', {session: false}))
  .get(function(req, res, next){
    if(!req.query.eid) return res.json({"status": "error", "message": "No entry id provided"});
    Entry.findById(req.query.eid, function(err, doc){
      if (err) return res.json({"status":"error", "message": "Error when requesting entry"});
      if (!doc || doc.user != req.user._id) return res.json({"status":"error", "message": "No entry with id " + req.query.eid});
      res.json({"status": "ok", "entry": doc});
    });
  })
  .post(function(req, res, next){
    if(!req.query.eid) return res.json({"status": "error", "message": "No entry id provided"});
    Entry.findById(req.query.eid, function(err, doc){
      if (err) return res.json({"status":"error", "message": "Error when requesting entry"});
      if (!doc || doc.user != req.user._id) return res.json({"status":"error", "message": "No entry with id " + req.query.eid});
      for(prop in req.body){
        doc[prop] = req.body[prop];
      }
      doc.save(function(err){
        if (err) return res.json({"status":"error", "message": "Error when updating entry"});
        res.json({"status": "ok", "entry": doc});
      });
    });
  })
  .delete(function(req, res, next){
    if(!req.query.eid) return res.json({"status": "error", "message": "No entry id provided"});
    Entry.remove({_id: req.query.eid, user: req.user._id}, function(err){
      if (err) return res.json({"status":"error", "message": "Error when requesting entry"});
      res.json({"status": "ok", "message": "Entry" + req.query.eid + " was deleted"});
    });
  })
  .put(form(
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
        //debug(req.form.errors);
        res.json({"status": "error", "message": req.form.errors})
      }
      else{
        var datetime = req.form.date;
        var time = req.form.time.split(":");
        //Get UTC time
        datetime.setTime(datetime.getTime() + datetime.getTimezoneOffset()*60*1000);
        datetime.setHours(time[0], time[1]);
        //debug(datetime);
        var params = {
          datetime: datetime,
          description: req.form.description,
          amount: req.form.amount,
          comment: req.form.comment,
          user: req.user._id
        }
        Entry.create(params, function(err, entry){
          if(err) return res.json({"status": "error", "message": "Error when creating entry"});
          res.json({"status": "ok"});
        });
      }
    }
  );

module.exports = router;
