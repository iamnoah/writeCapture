(function($) {
	function renderDebug() {
		var debug = (window.writeCapture || $.writeCapture).debug;
		var root = $('<ol class="debug" />'), cur = root, srcs = {};
		var extra = $('<div/>');
		$.each(debug,function() {
		    if(this.length && (this.join || this.callee)) {
		        extra.append('<p>'+Array.prototype.join.call(this,' ')+'</p>');
		        return;
		    }
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
	
		$(document.body).append(root).append(extra);
	}
	
	this.debugWriteCapture = true;
	$(function() {
		$('<input type="button" value="Debug writeCapture.js"</button" />').click(renderDebug).appendTo(document.body);
	});
})(jQuery);