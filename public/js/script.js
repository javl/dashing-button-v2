
var ws = new WebSocket('ws://localhost:40510');
ws.onopen = function () {
	ws.send('connected');
};

var debug_speed = false; // set to true to remove / speed up timers while testing
var working = false;
var data = null;

var latest_instagram_image = null;
var latest_amazon_image = null;
var latest_tags = null;

var timeout_interval = null;
var startTime = null;

ws.onmessage = function (ev) {
	data = JSON.parse(ev.data);

	// when the latest insta image for the influencer has been downloaded
	if(data.command == 'instagram_image_available'){
		latest_instagram_image = data.image_filename;
		console.log('instagram_image_available: ' + latest_instagram_image);
	}
	else if(data.command == 'amazon_image_available'){
		latest_amazon_image = data.image_filename;
		console.log('amazon_image_available: ' + latest_amazon_image);
	}

	// when we receive tags from the image analyzer
	else if (data.command == 'tags'){
		latest_tags = data.tags;
		console.log(latest_tags);
	}

	// Some error occured! Just say sorry and restart (error will be in the npm log)
	else if(data.command == 'error'){
		error_and_reload();
	}

	else if(data.command == 'button_pressed'){
		start_process(null);
	}
};

function start_process(specified_influencer){
	// Start the whole thing! The process (downloading image, analyzing, etc.)
	// can take a while, so we'll add some tricks to make it feel faster.
	// What we'll do is select an influencer straight away and start the download
	// and analyzing scripts. While this is going on, we show a simple spinning
	// animation as if we're still picking an influencer. This way we get a
	// headstart with the download while the user is focused on something else.
	if (working){
		return;
	}else{
		console.log('start process');
		startTime = new Date().getTime();
		working = true;
		// start the reset_timer that will reload the page if the whole run
		// didn't finishg within two minutes
		timeout_interval = setTimeout(error_and_reload, 120000);

		$('.tags').html('');
		$('.tags-top').html('').hide();
	}

	latest_instagram_image = null;
	latest_amazon_image = null;
	latest_tags = null;
	influencer = null;

	if (specified_influencer === null){
		influencer = select_influencer();
	}else{
		influencer = specified_influencer;
		highlight_selected_influencer();
	}

	request_instagram_image();
	set_influencer_avatar_and_name();

	hide_intro_slides(function(){ // hide the intro slides

		spin_influencers(function(){

			// spinning done, show 'searching' text
			$('.title-analyzing').show();
			$('.latest-amazon-image').hide();
			$('.tags').show();
			$('.title-searching-amazon').hide();
			$('#searchInstagramModal').modal('show');

			check_for_latest_instagram_image(function(){

				// if we get here, the instagram image became available
				show_latest_instagram_image();

				check_for_latest_tags(function(){
					// if we get here, the tags have been found.
					// show them in an animated way

					show_latest_tags(function(){

						check_for_latest_amazon_image(function(){
							show_latest_amazon_image(function(){
								$('.modal').modal('hide');
							});

						});

					});

				});

			});

		});

	});
}

function hide_intro_slides(callback){
	// check if modal needs to hide or is already gone (due to using the cursor)
	if($('#introModal').hasClass('show')){
		$('#introModal').on('hidden.bs.modal', function (e) {
			console.log('trigger on hide');
		$( "#introModal").unbind( 'hidden.bs.modal' );
			callback();
		}).modal('hide');
	}else{
		callback();
	}
}

function show_intro_slides(){
	$('#introModal').modal('show');
}

function show_latest_amazon_image(callback){
	setTimeout(function(){
		// if we get here, the amazon product was found
		 console.log('amazon found, show image!');

		 setTimeout(function(){
			$('.tags').fadeOut("slow", function(){});
			$('.title-searching-amazon').fadeOut("slow", function(){
				$('.latest-amazon-image').attr('src', '/amazon/'+latest_instagram_image).fadeIn("slow", function(){
					setTimeout(callback, 20000);
				});
			});

		 }, 2000);
	});
}

function show_latest_tags(callback){

	// wait for a bit before showing tags
	setTimeout(function(){

		var num_tags = latest_tags.length;
		var tag_delay = 800;
		var tags_string = '';
		$('.tags').html(''); // clear existing tags
		latest_tags.forEach(function(item, index){
			$('.tags').append( '<li class="tag hide-tag">'+item+'</i>');
			tags_string += item + ' ';
		});
		$('.tags-top').html('tags found: <i>' + tags_string + '</i>');

		$('.tag').delay(tag_delay).each(function(i) {
			$(this).delay(tag_delay * i).queue(function() {
				$(this).removeClass('hide-tag');
			});
		});

		// wait for two seconds so the next animation starts
		// when the last tag has faded in
		setTimeout(function(){
			$('.title-analyzing, .tags').slideUp("slow", function(){});
			$('.tags-top').slideDown("slow", function(){});
			$('.title-searching-amazon').slideDown("slow", function(){
				callback();
			});
		}, 2000 + (num_tags + 1 ) * tag_delay);

	}, 2000);

}

function request_instagram_image(){
	// use a get request to tell the server we want to receive the selected
	// influencers latest image. The server will respond via a websocket so
	// this function does not have callback
	$.ajax({
		method: "GET",
		url: "/api/influencer/image",
		data: { influencer_name: influencer}
	})
	.done(function() {
		//
	})
	.fail(function() {
		console.error('error in request_instagram_image');
		error_and_reload();
	});
}

function check_for_latest_instagram_image(callback){
	if (latest_instagram_image !== null){
		setTimeout(callback, 3000);
	}else{
		setTimeout(function(){
			check_for_latest_instagram_image(callback);
		}, 200);
	}
}

function check_for_latest_amazon_image(callback){
	if (latest_amazon_image !== null){
		callback();
	}else{
		setTimeout(function(){
			check_for_latest_amazon_image(callback);
		}, 200);
	}
}

function check_for_latest_tags(callback){
	if (latest_tags !== null){
		callback();
	}else{
		setTimeout(function(){
			check_for_latest_tags(callback);
		}, 200);
	}
}

function show_latest_instagram_image(){
	$('.modal').modal('hide'); // hide all modals first
	$('.latest-img').attr('src', '/profiles/'+influencer+'/'+latest_instagram_image);
	$('#latestImageModal').modal('show');
}

function highlight_random_influencer(){
	// show a circle around a random influencer, used during the spinning animation
	$('.selected').removeClass('selected');
	var random_influencer = Math.round(Math.random() * ($('.influencer').length-1));
	$('.influencer').eq(random_influencer).addClass('selected');
}

function highlight_selected_influencer(){
	// show a circle around the avatar of the influencer we've selected before
	$('.influencer').removeClass('selected').addClass('fade-out');
	$('.influencer[data-name="'+influencer+'"]').removeClass('fade-out').addClass('selected');
}

function remove_influencer_highlight(callback){
	// show a circle around the avatar of the influencer we've selected before
	$('.influencer').removeClass('fade-out');
	$('.influencer[data-name="'+influencer+'"]').removeClass('selected');
	setTimeout(callback, 2000);
}

function select_influencer(){
	// randomly select one of our influencers to use
	var random_number = Math.round(Math.random() * ($('.influencer').length-1));
	return $('.influencer').eq(random_number).data('name');
}

function set_influencer_avatar_and_name(){
	// update places where the name and avatar of our selected influencer should show up

	$('.influencer-name').html(influencer);

	if (influencer.substr(-1) != 's'){ // joe's / joss'
		$('.influencer-name-possesive').html('\'s');
	}else{
		$('.influencer-name-possesive').html('\'');
	}

	$('img.avatar').attr('src', '/profiles/'+influencer+'/avatar.jpg');
}

function delay(val){
	if (!debug_speed){
		return val;
	}else{
		return 0;
	}
}

// Randomly select influencers as if we're picking a random one
var spin_delay = 50;
function spin_influencers(callback){
	spin_delay *= 1.1; // increase delay between jumps
	if (spin_delay >= delay(1000)){ // slowed down enough, lets end this!
		spin_delay = 50; // reset the spin speed for the next run
		highlight_selected_influencer();
		setTimeout(callback, delay(2000)); // wait two seconds then finish
	}else{ // still spinning too fast, go again!
		highlight_random_influencer();
		setTimeout(function(){
			spin_influencers(callback);
		}, spin_delay);
	}
}

$(function() {
	$('.hidden-at-start').hide();
	$('.influencer').click(function(){
		console.log('start with ' + $(this).data('name'));
		start_process($(this).data('name'));
	});

});

function get_influencer_media(influencer){
	$.ajax({
		method: "GET",
		url: "/api/influencer",
		data: { influencer_name: influencer}
	})
	.done(function() {
		//
	})
	.fail(function() {
		error_and_reload();
	});
}

function hide_loading_popup(){
	$('.loading-popup').hide();
}

function show_loading_popup(){
	$('.loading-popup').show();
}

function hide_image_popup(){
	$('.image-popup').hide();
}

function show_image_popup(){
	$('.image-popup').show();
}

function error_and_reload(){
	console.error('some error occured, reload');
	$('.modal').modal('hide');
	$('#errorModal').modal('show');
	setTimeout(function(){
		location.reload();
	}, 5000);
}

$('#introModal').modal('show');
var current_slide = 1;
var slide_delays = [10000, 10000, 6000, 10000, 10000, 10000, 10000];

function next_slide(){
	$('.slide-'+current_slide).fadeOut('fast', function(){
		$('.progressdot-'+current_slide).hide();
		current_slide++;
		if (current_slide > slide_delays.length){
			current_slide = 1;
		}
		$('.slide-'+current_slide).fadeIn('slow', function(){
			setTimeout(next_slide, slide_delays[current_slide-1]);
		});
		$('.progressdot-'+current_slide).show();
	});
}
setTimeout(next_slide, slide_delays[0]);

function finish(){
	var endTime = new Date().getTime();
	console.log("total duration [s] = " + ((endTime-startTime)/1000));

	working = false;
	if (timeout_interval){
		console.log('clear the timeout_interval');
		clearInterval(timeout_interval);
	}
	remove_influencer_highlight(function(){
		show_intro_slides();
	});
}

$('#latestImageModal').on('hidden.bs.modal', function (e) {
	finish();
});

 $('.slide').on('click', function(){
 	$('body').css({cursor: 'default'});
// 	$(this).hide();
 });
