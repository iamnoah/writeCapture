$(function() {
	var dialog = $('#dialog'), originalHtml = dialog.html();
	$('.openDialog').click(function() {
		dialog.dialog({width: 387, height: 415}).addClass('loading').
			html(originalHtml).dialog('open');	
		setTimeout(function() {
			$.get('flickerPhotos.html',function(text) {				
				dialog.removeClass('loading');
				if(/sanitize=false/.exec(window.location)) {
					dialog.html(text);
				} else {
					dialog.html(writeCapture.sanitize(text));
				}
			});		
		},1500); // pretend this call takes some time
		return false;
	});
});