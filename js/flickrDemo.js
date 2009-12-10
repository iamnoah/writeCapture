$(function() {
	var dialog = $('#dialog'), originalHtml = dialog.html();
	// ?sanitize=false toggles writeCapture()
	if(!/sanitize=false/.test(window.location)) {
		dialog = dialog.writeCapture();
	}
	$('.openDialog').click(function() {
		dialog.dialog({width: 387, height: 415}).addClass('loading').
			html(originalHtml).dialog('open');	
		setTimeout(function() {
			dialog.load('flickerPhotos.html',function callback() {
				this.removeClass('loading');
			});
		},1500); // pretend this call takes some time
		return false;
	});
});