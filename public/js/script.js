$(function() {
// var images = $('.influencer-img');
// images.css({'opacity': 0.2});
	// $('.influencer-img').css({'border': '10px solid red'});
	$('.influencer-img').click(function(){

		$.ajax({
		  method: "GET",
		  url: "/api/influencer",
		  data: { influencer_name: $(this).data('name')}
		})
		.done(function() {
			alert( "success" );
		})
		.fail(function() {
			alert( "error" );
		});
	})
});
