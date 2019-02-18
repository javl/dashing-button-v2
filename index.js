'use strict';
process.env.TZ = 'Europe/Amsterdam';

// load 3rd party modules
var nunjucks       = require('nunjucks');
// var moment         = require('moment');

// var exec           = require('child_process').exec; // used for dig, shutdown, etc.
const { spawn } = require('child_process');
const express      = require('express');
const {eachSeries} = require('async');
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


app.get('/api/influencer', function(req, res) {
  console.log(req.query.influencer_name);
  return 'ok';
  // res.render('index.html', {
  //   influencers: influencers
  // });
});


app.get('/run_detection', function(req, res) {
  // res.render('index.html', {
    // influencers: influencers
  // });
});

app.get('/get_image', function(req, res) {
  // res.render('index.html', {
    // influencers: influencers
  // });
});

app.get('/get_all', function(req, res) {
  // console.log(influencers.join());
  get_latest_image(influencers.join());
  // eachSeries(influencers, function(influencer, callback) {

  //     // Perform operation on file here.
  //     setTimeout(function(){
  //       console.log('Get images for ' + influencer);
  //       get_latest_image(influencer);
  //       callback(null);
  //     }, 2000);
  //     // get_latest_image(influencer);

  // }, function(err) {
  //     // if any of the file processing produced an error, err would equal that error
  //     if( err ) {
  //       // One of the iterations produced an error.
  //       // All processing will now stop.
  //       console.log('error getting all images: ', err);
  //     } else {
  //       console.log('retrieved all images');
  //     }
  // });

});




function get_latest_image(influencer){
  console.log('get_latest_image('+influencer+')');
  // const ls = spawn('instagram-scraper', ['@insta_args.txt', influencer, '--maximum=1', '--media-types=image', '--destination=profiles', '--retain-username'], {
  const ls = spawn('instagram-scraper', ['@insta_args.txt', influencer, '--maximum=1', '--media-types=image', '--destination=profiles', '--retain-username'], {
    cwd: '/home/javl/projects/dashing-button-v2'
  });
  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
  // console.log(ls);
}
// get_latest_image(influencers[0]);



app.listen(8000, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("App started at port 8080");
  }
});