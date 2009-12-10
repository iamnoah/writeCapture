(function($,wc,noop) {
	var methods = {
		load: load,
		replaceWith: replaceWith,
		html: html
	};
	
	$.fn.writeCapture = function(method,content,options) {
		var m = methods[method] || error(method);
		if(method == 'load') {
			return m.call(this,content,options);
		}
		return doEach.call(this,content,options,m);
	};
	
	function doEach(content,options,action) {
		var done;
		if(options && options.done) {
			done = options.done;
			delete options.done;
		} else if($.isFunction(options)) {
			done = options;
			options = null;
		}
		wc.sanitizeSerial($.map(this,function(el) {
			return {
				html: content,
				options: options,
				action: function(text) {
					action.call(el,text);
				}
			};
		}),done);
		return this;
	}
	
	
	function html(safe) {
		$(this).html(safe);
	}
	
	function replaceWith(safe) {
		$(this).replaceWith(safe);
	}
	
	function load(url,options) {
		var self = this,  selector, off = url.indexOf(' ');
		if ( off >= 0 ) {
			selector = url.slice(off, url.length);
			url = url.slice(0, off);
		}
		return $.ajax({
			url: url,
			type:  options && options.type || "GET",
			dataType: "html",
			data: options && options.params,
			complete: loadCallback(self,options,selector)
		});
	}
	
	function loadCallback(self,options,selector) {
		return function(res,status) {
			if ( status == "success" || status == "notmodified" ) {
				var text = getText(res.responseText,selector);
				doEach.call(self,text,options,html);
			}
		};
	}
	
	var PLACEHOLDER = /jquery-writeCapture-script-placeholder-(\d+)-wc/g;
	function getText(text,selector) {
		if(!selector || !text) return text;
		
		var id = 0, scripts = {};			
		return $('<div/>').append(
			text.replace(/<script(.|\s)*?\/script>/g, function(s) {
				scripts[id] = s;
				return "jquery-writeCapture-script-placeholder-"+(id++)+'-wc';
			})
		).find(selector).html().replace(PLACEHOLDER,function(all,id) {
			return scripts[id];
		});
	}
	
	function error(method) {
		throw "invalid method parameter "+method;
	}
	
	// expose sanitize
	$.sanitize = wc.sanitize;
	$.sanitizeSerial = wc.sanitizeSerial;
})(jQuery,writeCapture.noConflict());