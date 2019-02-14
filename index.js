'use strict';
process.env.TZ = 'Europe/Amsterdam';

// load 3rd party modules
var nunjucks       = require('nunjucks');
// var moment         = require('moment');

// var exec           = require('child_process').exec; // used for dig, shutdown, etc.
const express      = require('express');

const influencers = require('./influencers').influencers;

var app            = express();
app.use(express.static('public'));
// app.use(bodyParser.urlencoded({
//  extended: true
// })); // for parsing application/x-www-form-urlencoded

// Authentication and Authorization Middleware
var auth = function(req, res, next) {
    return next();
};

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

app.get('/', function(req, res) {
  res.render('index.html', {
    influencers: influencers
  });
});

app.listen(8080, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("App started at port 8080");
  }
});