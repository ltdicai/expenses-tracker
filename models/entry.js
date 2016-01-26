var express = require('express');
var debug = require('debug')('expenses:server');
var mongoose = require('mongoose');

var entrySchema = new mongoose.Schema({
  datetime: Date,
  description: String,
  amount: Number,
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  comment: String,
});

var Entry = mongoose.model('Entry', entrySchema);

module.exports = Entry;
