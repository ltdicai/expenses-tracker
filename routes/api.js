var express = require('express');
var router = express.Router();
var debug = require('debug')('expenses:server');
var User = require('../models/user.js');
var Entry = require('../models/entry.js');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;

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

// router.get('/', passport.authenticate('basic', {session: false}), function(req, res, next) {
//   debug(req.body);
//   res.json({
//     "availableActions": {
//       "add "
//     }
//   });
// });

router.route('/user')
  .get(function(req, res, next){
    debug(req.body);
    if(!req.body.username) return res.json({"status": "error", "message": "No username provided"});
    User.findOne({username: req.body.username}, function(err, doc){
      if (err) return res.json({"status": "error", "message": "User " + req.body.username + "doesn't exists"});
      res.json({"status": "ok"});
    });
  })
  .post(function(req, res, next){
    debug(req.body);
    if(!req.body.username) return res.json({"status": "error", "message": "No username provided"});
    if(!req.body.password) return res.json({"status": "error", "message": "No password provided"});
    User.register(
      new User({username: req.body.username}), req.body.password, function(err) {
        if (err) {
          return res.json({"status": "error", "message": "Couldn't add user"});
        }
        debug('Sign up user ' + req.body.username + ' succesfully');
        res.json({"status": "ok"});
      }
    );
  });

router.route('/entries')
  .all(passport.authenticate('basic', {session: false}))
  .get(function(req, res, next){
    Entry.find({username: req.user.username}, function(err, docs){
      if (err) return res.json({"status":"error", "message": "Couldn't get entries"});
      res.json({"status": "ok", "entries": docs});
    })
  });

router.route('/entry')
  .all(passport.authenticate('basic', {session: false}))
  .get(function(req, res, next){
    if(!req.query.eid) return res.json({"status": "error", "message": "No entry id provided"});
    Entry.findById(req.query.eid, function(err, doc){
      if (err) return res.json({"status":"error", "message": "Error when requesting entry"});
      if (!doc) return res.json({"status":"error", "message": "No entry with id " + req.query.eid});
      res.json({"status": "ok", "entry": doc});
    });
  })
  // .post()
  // .put()
  .delete(function(req, res, next){
    if(!req.query.eid) return res.json({"status": "error", "message": "No entry id provided"});
    Entry.remove({_id: req.query.eid}, function(err){
      if (err) return res.json({"status":"error", "message": "Error when requesting entry"});
      res.json({"status": "ok", "message": "Entry" + req.query.eid + " was deleted"});
    });
  });
module.exports = router;
