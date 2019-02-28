var ws = new WebSocket('ws://localhost:40510');
ws.onopen = function () {
    console.log('websocket is connected ...')
    ws.send('connected')
}
var working = false;
var data = null;
ws.onmessage = function (ev) {
    console.log(ev);
    data = JSON.parse(ev.data);
    console.log(data);

    if(data.command == 'influencer_updated'){
    	show_media();
    }
    else if (data.command == 'tags'){
    	var tags = '';
    	data.tags.forEach(function(item, index){
   			tags += item.name + '&nbsp;-&nbsp;<i>'+item.confidence.toFixed(3)+'%</i><br />';
    	})
    	$('.tags-list').html(tags);
    	$('.title-analyzing').html('<h4>'+data.tags.length+' Tags found</h4>');
    	$('.amazon-searching-text').html('Searching for matching product on Amazon...');
    }
    else if(data.command == 'error'){
    	error_and_restart();
    }
    else if(data.command == 'restart'){
    	if (!working){
    		working = true;
    		restart();
    	}
    }
    else if(data.command == 'got_amazon'){
    	$('.latest-amazon-img').attr('src', 'amazon_detail.jpg');
    	$('#sideBySideModal').modal('show');
    }
}

function show_media(){
	console.log('show media');
	if(spinning){
		console.log('wait for spinner');
		setTimeout(show_media, 500);
		return;
	}
	$('#loadingModal').modal('hide');
	$('.latest-img').attr('src', '/profiles/'+data.influencer+'/latest_image.jpg');
	$('.influencer-img[data-name="'+data.influencer+'"]').attr('src', '/profiles/'+data.influencer+'/avatar.jpg');
	$('.modal-avatar').attr('src', '/profiles/'+data.influencer+'/avatar.jpg');
	$('.modal-influencer-name').html(data.influencer);
	$('#imageModal').modal('show');
	// setTimeout(function(){
	// 	$('#analyzingModal').modal('show');
	// }, 4000);
}

function highlight_random_influencer(){
	$('.selected').removeClass('selected');
	var random_influencer = Math.round(Math.random() * ($('.influencer').length-1));
	$('.influencer').eq(random_influencer).addClass('selected');
}

function highlight_influencer(influencer){
	$('.selected').removeClass('selected');
	$('.influencer[data-name="'+influencer+'"]').addClass('selected');
}

function select_influencer(){
	var random_number = Math.round(Math.random() * ($('.influencer').length-1));
	return $('.influencer').eq(random_number).data('name');
}

// Randomly select influencers as if we're picking a random one
var spin_speed = 50;
var spinning = false;
function spin_influencers (final_influencer) {
	spinning = true;
	// if (spin_speed<=800) {
	if (spin_speed<=100) {
		highlight_random_influencer();
		spin_speed*=1.1;
		setTimeout(function(){
			spin_influencers(final_influencer)
		}, spin_speed);
	}else{
		console.log('show loader')
		highlight_influencer(final_influencer);
		spin_speed = 50;
		var postfix = '\'';
		if (final_influencer.substr(-1) != 's'){
			postfix += 's';
		}
		$('.loading-text').html('<h4>Searching for <strong>@'+final_influencer+'</strong>'+postfix+' latest Instagram post...</h4>')
		$('#loadingModal').modal('show');
		setTimeout(function(){
			spinning = false;
		}, 2000);
	}
}

function restart(preset_influencer=null){
	console.log("preset: "+preset_influencer)
	var influencer = preset_influencer;
	if (preset_influencer === null){
		influencer = select_influencer();
	}
	$('.title-analyzing').html('<h4>Analyzing image...</h4><div class="spinner-border" role="status"></div>');
	console.log('influencer: ', influencer);
	spin_influencers(influencer);
	get_influencer_media(influencer);

}

$(function() {
	$('.hidden-at-start').hide();//removeClass('hidden-at-start');
// var images = $('.influencer-img');
// images.css({'opacity': 0.2});
	// $('.influencer-img').css({'border': '10px solid red'});

	$('.influencer').click(function(){
		restart($(this).data('name'));
	})

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
		error_and_restart();
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

function error_and_restart(){
	$('.modal').modal('hide');
	$('#errorModal').modal('show');
	setTimeout(function(){
		$('#errorModal').modal('hide');
	}, 5000);
	setTimeout(function(){
		restart();
	}, 2000);
}