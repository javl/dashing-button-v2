var ws = new WebSocket('ws://localhost:40510');
ws.onopen = function () {
    console.log('websocket is connected ...')
    ws.send('connected')
}
var data = null;
ws.onmessage = function (ev) {
    console.log(ev);
    data = JSON.parse(ev.data);
    console.log(data);

    if (data.command == 'update_avatar'){
    	// $('.influencer-img[data-name="'+data.influencer+'"]').attr('src', '/profiles/'+data.influencer+'/avatar.jpg');
		// $('#loadingModal').modal('show')
    }

    else if(data.command == 'influencer_updated'){
    	$('#loadingModal').modal('hide');
    	$('.latest-img').attr('src', '/profiles/'+data.influencer+'/latest_image.jpg');
    	$('.modal-avatar').attr('src', '/profiles/'+data.influencer+'/avatar.jpg');
    	$('.modal-influencer-name').html(data.influencer);
    	$('#imageModal').modal('show');
    	setTimeout(function(){
    		$('#analyzingModal').modal('show');
    	}, 1000);
    	// hide_loading_popup();
    	// show_image_popup();

    }
}


	$('#imageModal').on('show.bs.modal', function () {
		console.log("size");
       // $(this).find('.modal-body').css({
       //        width: 'auto',
       //        height: 'auto',
       //        'max-height': '100%'
       // });
	});

$(function() {
	$('.hidden-at-start').hide();//removeClass('hidden-at-start');
// var images = $('.influencer-img');
// images.css({'opacity': 0.2});
	// $('.influencer-img').css({'border': '10px solid red'});

	$('.influencer-img').click(function(){
		var influencer = $(this).data('name');
		var postfix = "'";
		if (influencer.slice(-1) != 's'){
			postfix += 's';
		}
		$('#loadingModal').find('.loading-text').html('Looking for <strong>@' + influencer+postfix +'</strong> latest photo on Instagram...');
		$('#loadingModal').modal('show')

		$.ajax({
		  method: "GET",
		  url: "/api/influencer",
		  data: { influencer_name: influencer}
		})
		.done(function() {
			// $('#loadingModal').modal('hide');
		})
		.fail(function() {
			alert( "error" );
		});
	})

});

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