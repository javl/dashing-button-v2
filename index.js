'use strict';
process.env.TZ = 'Europe/Amsterdam';
const request = require('request');
const fs = require("fs"); // for reading json files
const ms = require('./microsoft_settings');
const puppeteer = require('puppeteer-core');

const subscriptionKey = ms.key;
// load 3rd party modules
var nunjucks       = require('nunjucks');
// var moment         = require('moment');
// var exec           = require('child_process').exec; // used for dig, shutdown, etc.
const { spawn }    = require('child_process');
const express      = require('express');

const {eachSeries} = require('async');
const influencers  = require('./influencers').influencers;

var amazon_url = 'https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=';

var app            = express();
app.use(express.static('public'));

var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server,
wss = new WebSocketServer({port: 40510})

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    console.log('received: %s', message)
  })

  // function sender(){
  //   ws.send('this is a msg');
  // }

  // setInterval(
  //   () => ws.send(`${new Date()}`),
  //   1000
  // )
})

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
  res.send('working');
  get_latest_image(req.query.influencer_name);
  // res.render('index.html', {
  //   influencers: influencers
  // });
});


app.get('/run_detection', function(req, res) {
  // res.render('index.html', {
    // influencers: influencers
  // });
});

app.get('/button_pressed', function(req, res) {
  console.log('button was pressed!');
  res.send('ok');
  send_to_clients({
    command: 'restart'
  });
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
  // setTimeout(function(){
  //   send_to_clients({
  //     command: 'influencer_updated',
  //     influencer: influencer
  //   });
  // }, 3000);
  // return;

  // return;
  console.log('get_latest_image('+influencer+')');
  // const ls = spawn('instagram-scraper', ['@insta_args.txt', influencer, '--maximum=1', '--media-types=image', '--destination=profiles', '--retain-username'], {
  const ls = spawn('instagram-scraper', ['@insta_args.txt', influencer, '--maximum=1', '--media-types=image', '--destination=public/profiles', '--retain-username', '--media-metadata'], {
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
    if (code == 0){
      send_to_clients({
        command: 'influencer_updated',
        influencer: influencer
      });

      try {
        var media_metadata = require('./public/profiles/'+influencer+'/'+influencer+'.json');
        analyze_image(media_metadata[0]['display_url']);
      }
      catch (e) {
        console.log("error reading json: ");
        console.log(e);
        send_to_clients({
          command: 'error'
        });
      }
    }
  });
}

function analyze_image(imageUrl){
  ms.options.body = '{"url": ' + '"' + imageUrl + '"}',

  request.post(ms.options, (error, response, body) => {
    if (error) {
      console.log('Error: ', error);
      return;
    }
    var result      = JSON.parse(body);
    var useful_tags = [];
    var search_tags = [];
    try{
      var dominant_color = '';
      for(var i=0;i<result.color.dominantColors.length;i++){
        if(result.color.dominantColors[i].toLowerCase() != 'black' && result.color.dominantColors[i].toLowerCase() != 'brown'){
          search_tags.push(result.color.dominantColors[i].toLowerCase());
          break;
        }
      }
    }catch(e){
      console.log('no color found?')
    }
    console.log(result);
    if (result.tags === undefined){
      result.tags = [];
    }
    result.tags.forEach(function(tag, index){
      if(tag.name != 'person'){
        useful_tags.push(tag)
        search_tags.push(tag.name);
      }
    })
    send_to_clients({
      command: 'tags',
      tags: useful_tags
    });
    get_amazon_screenshot(search_tags)
  });
}

function send_to_clients(data){
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

app.listen(8000, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("App started at port 8080");
  }
});




async function get_amazon_screenshot(keywords){
    const browser = await puppeteer.launch({"headless": true, "executablePath":"/usr/bin/chromium"});
    const page = await browser.newPage();
    console.log("open page");
    await page.goto(amazon_url + keywords.join('+'));
    await page.setViewport({
      "width": 1024,
      "height": 1080,
    });
   const links = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.s-access-detail-page'))
    return links.map(link => link.href).slice(0, 10)
    })
   // console.log(links);
    await page.goto(links[0])

    await page.addStyleTag({content: '.nav-flyout-anchor{display: "none"}'})

    await page.evaluate(() => {
      const loginButton = document.querySelector('.nav-flyout-anchor');
      if (loginButton !== null){
        loginButton.parentNode.removeChild(loginButton);
      }else{
        console.log("liginBUtton is null")
      }
    });

    await page.screenshot({
      path: 'public/amazon_detail.jpg',
      fullPage: false,
      // omitBackground: true,
      clip: { // clip the cookie notice
       'x': 0,
       'y': 0,
       'width': 800,
       'height': 700
      }
    });
    send_to_clients({
      command: 'got_amazon'
    })
}