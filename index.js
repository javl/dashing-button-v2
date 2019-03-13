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

app.get('/api/influencer/image', function(req, res) {
    res.send('getting image for influencer ' + req.query.influencer_name);
    get_latest_image(req.query.influencer_name);
});

app.get('/api/get_all_avatars', function(req, res) {
    res.send('getting all avatars');
    get_all_avatars();
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
        command: 'button_pressed'
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

        if (code == 0){
            try {
                var media_metadata = require('./public/profiles/'+influencer+'/'+influencer+'.json');
                var useIndex = -1;
                for (var i=0;i<media_metadata.length; i++){
                    if (media_metadata[i].__typename == 'GraphImage' || media_metadata[i].__typename == 'GraphSidecar' ){
                        useIndex = i;
                        break;
                    }
                }
                if (useIndex == -1){
                    console.log('somehow we didn\'t get a GraphImage or GraphSidecar?');
                }
                var image_filename = media_metadata[useIndex].display_url.split('/');
                image_filename = image_filename[image_filename.length-1].split('?')[0];

                analyze_image(media_metadata[useIndex].display_url, image_filename);


                // send_to_clients({
                //     command: 'influencer_updated',
                //     influencer: influencer,
                //     filename: filename
                // });
                send_to_clients({
                    command: 'instagram_image_available',
                    influencer: influencer,
                    image_filename: image_filename
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
        else {
            console.log(`instagram-scraper child process exited with code ${code}`);
        }
    });
}

function get_all_avatars(){
    console.log('get_all_avatars');
    const child = spawn('instagram-scraper',
        ['--login-user=instaUser',
        '--login-pass=instaPass',
        influencers.join(','),
        // '--latest',
        '--maximum=1',
        '--media-types=image',
        '--destination=public/profiles',
        '--retain-username'], {
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

        if (code == 0){
            console.log('got avatars');
        }
        else {
            console.log(`instagram-scraper child process exited with code ${code}`);
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
                    // break;
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

        // var target_url = amazon_url + keywords.slice(0, 5).join('+');
        var target_url = amazon_url + keywords.join('+');

        // wayyyyyy too many try/catches here, but works well for debugging
        var browser;
        var page;
        try {
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            });
            page = await browser.newPage();
            await page.setViewport({ width: 980, height: 800 });
        }catch (err){
            console.error('error starting browser:');
            console.error(err);
        }

        try {
            await page.goto(target_url);
        }catch(err){
            send_to_clients({ command: 'error' });
            console.error('error on going to target_url:');
            console.error(err);
        }

        try {
            await page.evaluate(() => {
                document.querySelector('.s-access-image').click();
            });
        } catch (err) {
            try {
                await page.evaluate(() => {
                    document.querySelector('.s-image').click();
                });
            } catch (err) {
                send_to_clients({ command: 'error' });
                console.error('error on clicking .s-access-image: ');
                console.error(err);
                console.error('Page with error: ');
                console.error(page.url());
                throw(err);
            }

        }

        try {
            await page.waitForSelector('.a-color-price');
            console.log('Url for Amazon product: ');
            console.log(page.url());
            console.log('');
        } catch (err){
            send_to_clients({ command: 'error' });
            console.error('error on waitForSelector .a-color-price:');
            console.error(err);
            console.error('Page with error: ');
            console.error(page.url());
            throw(err);
        }

        try {
            // use instaFilename also for the amazon image, just store it in a
            // different folder
            await page.screenshot({path: 'public/amazon/'+instaFilename});
            console.log('Screenshot saved at:');
            console.log('public/amazon/'+instaFilename);

            send_to_clients({
                command: 'amazon_image_available',
                image_filename: instaFilename
            });

        }catch(err){
            send_to_clients({ command: 'error' });
            console.log('error on taking screenshot: ');
            console.log(err);
            throw(err);
        }

        try {
            await browser.close();
        }catch(err){
            console.log('error on clowing browser: ');
            console.log(err);
        }


      })();
    } catch (err) {
        console.log('error on get_amazon_screenshot:');
        console.error(err);
    }
}
