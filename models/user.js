var express = require('express');
var debug = require('debug')('expenses:server');
var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

//var Entry = require('entry.js');

var userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

userSchema.methods.entries = function(cb){
  return this.model('Entry').find({user: this._id}, cb);
}

var User = mongoose.model('User', userSchema);

module.exports = User;
