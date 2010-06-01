(function($) {
	function renderDebug() {
		var debug = (window.writeCapture || $.writeCapture).debug;
		var root = $('<ol class="debug" />'), cur = root, srcs = {};
		$.each(debug,function() {
			var it = srcs[this.src] || (srcs[this.src] = {src:this.src, el: $('<div><h3>'+this.src+'</h3><ol /></div>'), parent: cur});				
			switch(this.type) {
				case 'replace':
					$('<li />').appendTo(cur).append(it.el);
					break;
				case 'pause':
					cur = $(it.el).find('ol');
					break;
				case 'resume':
					cur = it.parent;
					break;
				case 'out':
					it.el.find('> h3').after('<h4>out</h4><div>'+this.data.replace(/</g,'&lt;')+'</div>');
					break;
			}
		
			var found = false;
			it.el.parentsUntil(root).siblings().each(function() {
				found = found || this.innerHTML.indexOf(it.src) !== -1;
				return !found;
			});
			if(found) {
				it.el.addClass('outOfOrder');
			}
		});
	
		$(document.body).append(root);			
	}
	
	this.debugWriteCapture = true;
	$(function() {
		$('<input type="button" value="Debug writeCapture.js"</button" />').click(renderDebug).appendTo(document.body);
	});
})(jQuery);