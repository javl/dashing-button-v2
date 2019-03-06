'use strict';

process.env.TZ = 'Europe/Amsterdam';
const request = require('request');
const fs = require("fs"); // for reading json files
const ms = require('./microsoft_settings');
const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-core');

// Get instagram details from credentials file
const instaUser = require('./credentials').instaUser;
const instaPass = require('./credentials').instaPass;

var nunjucks       = require('nunjucks');

const { spawn }    = require('child_process');
const express      = require('express');

const {eachSeries} = require('async');
const influencers  = require('./influencers').influencers;

var amazon_url = 'https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=';

var app            = express();
app.use(express.static('public'));

var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server,
wss = new WebSocketServer({port: 40510});

wss.on('connection', function (ws) {
    ws.on('message', function (message) {
    console.log('received: %s', message);
});

  // function sender(){
  //   ws.send('this is a msg');
  // }

  // setInterval(
  //   () => ws.send(`${new Date()}`),
  //   1000
  // )
});

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

// app.get('/get_all', function(req, res) {
//     get_latest_image(influencers.join());
// });

function get_latest_image(influencer){
    const child = spawn('instagram-scraper',
        ['--login-user=instaUser',
        '--login-pass=instaPass',
        influencer,
        // '--latest',
        '--maximum=1',
        '--media-types=image',
        '--destination=public/profiles',
        '--retain-username',
        '--media-metadata'], {
        cwd: __dirname // run in this script's directory
    });
    child.on('error', function(err) {
        console.log(`Error on spawning child: ${err}`);
    });

    child.stdout.on('data', (data) => {
        // console.log(`stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if (code == 0){

            try {
                var media_metadata = require('./public/profiles/'+influencer+'/'+influencer+'.json');
                var useIndex = 0;
                for (var i=0;i<media_metadata.length; i++){
                    if (media_metadata[i].__typename == 'GraphImage'){
                        useIndex = i;
                        break;
                    }
                }
                var filename = media_metadata[useIndex].display_url.split('/');
                filename = filename[filename.length-1].split('?')[0];

                analyze_image(media_metadata[useIndex].display_url, filename);


                send_to_clients({
                    command: 'influencer_updated',
                    influencer: influencer,
                    filename: filename
                });

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

function analyze_image(imageUrl, instaFilename){
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
            var ignore_colors = ['white', 'black', 'brown']
            for(var i=0;i<result.color.dominantColors.length;i++){
                if(ignore_colors.indexOf(result.color.dominantColors[i].toLowerCase()) == -1){
                    search_tags.push(result.color.dominantColors[i].toLowerCase());
                    break;
                }
            }
        }catch(e){
            console.log('no color found?');
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
        });

        send_to_clients({
            command: 'tags',
            tags: useful_tags
        });
        get_amazon_screenshot(search_tags, instaFilename);
    });
}


// Return only base file name without dir
// function get_most_recent_image_file(dir, callback) {
    // var files = fs.readdirSync(dir);

    // // use underscore for max()
    // return _.max(files, function (f) {
    //     var fullpath = path.join(dir, f);
    //     // ctime = creation time is used
    //     // replace with mtime for modification time
    //     return fs.statSync(fullpath).ctime;
    // });
// }

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
        console.log("App started at port 8000");
    }
});

async function get_amazon_screenshot(keywords, instaFilename){
    try {
      (async () => {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: false
        });
        const page = await browser.newPage();

        let result = await page.evaluate(() => {
                    return window.innerWidth;
                });

        console.log(`Detected window.innerWidth to be ${result}.`);
        await page.setViewport({ width: 980, height: 800 });

        result = await page.evaluate(() => {
                    return window.innerWidth;
                });

        console.log(`Detected window.innerWidth to be ${result}.`);
        var target_url = amazon_url + keywords.slice(0, 5).join('+');
        console.log('goto: ', target_url);
        await page.goto(target_url);
        // await page.waitForSelector('#resultsCol');
        // await page.screenshot({path: 'public/amazon/amazon_list.png'});
        // console.log('See screenshot: ' + 'public/amazon/amazon_list.jpg');
        // await page.click('#pagnNextString');
        // await page.waitForSelector('#resultsCol');
        // const pullovers = await page.$$('a.a-link-normal.a-text-normal');
        // const pullovers = await page.$$('s-access-image');
        // await pullovers[1].click();
        await page.evaluate(() => {
            document.querySelector('.s-access-image').click();
        });
        await page.waitForSelector('.a-color-price');
        console.log(page.url());
       // const imageUrl = await page.evaluate(() =>
       //      document.querySelector("#landingImage").getAttribute('src') // image selector
       // ); // here we got the image url.
    // Now just simply pass the image url to the downloader function to
        // console.log('image: ', imageUrl);

        await page.screenshot({path: 'public/amazon/'+instaFilename});
        await browser.close();
        console.log('See screenshot: ' + 'public/amazon/'+instaFilename);
        send_to_clients({
            command: 'got_amazon',
            image_filename: instaFilename
        });
      })();
    } catch (err) {
      console.error(err);
    }
//     await page.screenshot({
//         path: 'public/amazon_detail.jpg',
//             fullPage: false,
//         });
//     }
}
// async function get_amazon_screenshot(keywords){
//     console.log("get amazon screenshot");
//     var target_url = amazon_url + keywords.slice(0, 5).join('+');
//     console.log("open page: " + target_url);
//     const browser = await puppeteer.launch({
//         args: ['--no-sandbox', '--disable-setuid-sandbox'],
//         headless: true,
//         // executablePath:"/usr/bin/chromium",
//     });
//     const page = await browser.newPage();
//     await page.setViewport({
//         "width": 1000,
//         "height": 800,
//     });

//     console.log('goto page');
//     await page.goto(target_url);

//     const links = await page.evaluate(() => {
//         const links = Array.from(document.querySelectorAll('.s-access-detail-page'));
//         return links.map(link => link.href).slice(0, 10);
//     });

//     if (links.length > 0){
//         console.log("go to link");
//         await page.goto(links[0]);
//         console.log("take screenshot");

//         await page.addStyleTag({content: '.nav-flyout-anchor{display: "none"}'});

//         await page.evaluate(() => {
//             const loginButton = document.querySelector('.nav-flyout-anchor');
//             if (loginButton !== null){
//                 loginButton.parentNode.removeChild(loginButton);
//             }else{
//                 console.log("liginBUtton is null");
//             }
//         });

//         await page.screenshot({
//             path: 'public/amazon_detail.jpg',
//             fullPage: false,
//         });
//         send_to_clients({
//             command: 'got_amazon'
//         });
//     }
// }
