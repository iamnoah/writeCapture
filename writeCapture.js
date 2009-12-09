/**
 * writeCapture.js v0.2.1
 *
 * @author noah <noah.sloan@gmail.com>
 * 
 */
(function($,global,doEvil) {
	// ensure we have our support functions
	$ = $ || (function(jQuery) {
		/**
		 * @name writeCaptureSupport
		 *
		 * The support functions writeCapture needs.
		 */		
		return {
			/**
			 * Takes an options parameter that must support the following:
			 * {
			 * 	url: url,
			 * 	type: 'GET', // all requests are GET
			 * 	dataType: "script", // it this is set to script, script tag injection is expected, otherwise, treat as plain text
			 * 	async: true/false, // local scripts are loaded synchronously by default
			 * 	success: callback(text,status), // must not pass a truthy 3rd parameter
			 * 	error: callback(xhr,status,error) // must pass truthy 3rd parameter to indicate error
			 * }
			 */
			ajax: jQuery.ajax,
			/**
			 * @param {String Element} selector an Element or selector
			 * @return {Element} the first element matching selector
			 */
			$: function(s) { return jQuery(s)[0]; },
			/**
			 * @param {String jQuery Element} selector the element to replace.
			 * writeCapture only needs the first matched element to be replaced.
			 * @param {String} content the content to replace 
			 * the matched element with. script tags must be evaluated/loaded 
			 * and executed if present.
			 */
			replaceWith: function(selector,content) {
				jQuery(jQuery(selector)[0]).replaceWith(content);
			}
		};
	})(global.jQuery);
	
	// utilities
	function each(array,fn) {
		for(var i =0, len = array.length; i < len; i++) { 
			fn(array[i]); 
		}
	}	
	function isFunction(o) {
		return Object.prototype.toString.call(o) === "[object Function]";
	}
	function slice(array,start,end) {
		return Array.prototype.slice.call(array,start || 0,end || array && array.length);		
	}
	function any(array,fn) {
		var result = false;
		each(array,check);
		function check(it) {
			return !(result = fn(it));
		}
		return result;
	}
	function defer(ctx,name) {
		setTimeout(function() { ctx[name](); },1);
	}
	
	/**
	 * Provides a task queue for ensuring that scripts are run in order.
	 * 
	 * 
	 */
	function Q(parent) {
		this._queue = [];
		this._children = [];
		this._parent = parent;
		if(parent) parent._register(this);
	}
	
	Q.prototype = {
		_paused: false,
		push: function (task) {
			this._queue.push(task);
			this._next();
		},
		pause: function() {
			this._paused = true;
		},
		resume: function() {
			this._paused = false;
			this._next(true);
		},
		_register: function(child) {
			this._children.push(child);
		},
		_isPaused: function() {
			return this._paused || any(this._children,isPaused);
			function isPaused(c) {
				return c._isPaused();
			}
		},
		_next: function(resuming) {
			var next;
			if(!this._isPaused()) {
				if ((next = this._queue.shift())) {
					next();
					this._next();
				} else if(this._parent) {
					// !paused and queue is empty, so let parent queue resume running
					if(resuming) {
						// TODO why is the defer necessary? is it safe(deterministic)? i.e., could we ever have two timeouts at the same time? [testing says no, needs a proof]
						defer(this._parent,'_next');
					} else {
						this._parent._next();
					}
				}
			}
		}
	};
	
	function capture() {
		var state = {
			write: global.document.write,
			out: ''
		};
		global.document.write = replacementWrite;
		function replacementWrite(s) {
			state.out +=  s;
		}
		return state;
	}
	function uncapture(state) {
		global.document.write = state.write;
		return state.out;
	}
	
	function clean(code) {
		// IE will execute inline scripts with <!-- (uncommented) on the first
		// line, but will not eval() them happily
		return code && code.replace(/^\s*<!(\[CDATA\[|--)/,'').replace(/(\]\]|--)>\s*$/,'');
	}
	
	function ignore() {}
	function doLog(code,error) {
		console.error("Error",error,"executing code:",code);
	}
	
	var logError = isFunction(global.console && console.error) ? 
			doLog : ignore;
	
	function captureWrite(code) {
		var state = capture();
		try {
			doEvil(clean(code));
		} catch(e) {
			logError(code,e);
		} finally {
			uncapture(state);
		}
		return state.out;
	}
	
	// copied from jQuery
	function isXDomain(src) {
		var parts = /^(\w+:)?\/\/([^\/?#]+)/.exec(src);
		return parts && ( parts[1] && parts[1] != location.protocol || parts[2] != location.host );
	}
	
	var SCRIPT_TAGS = /(<script(?:.|[\n\r])*?>)((?:.|[\n\r])*?)<\/script>/g, 
		SRC_ATTR = /src="(.*?)"/,
		GLOBAL = "__document_write_ajax_callbacks__",
		DIV_PREFIX = "__document_write_ajax_div-",
		TEMPLATE = "window['"+GLOBAL+"']['%d']();",
		callbacks = global[GLOBAL] = {},
		global_id = 0;
	function nextId() {
		return (++global_id).toString();
	}
	
	/**
	 * Sanitize the given HTML so that the scripts will execute with a modified
	 * document.write that will capture the output and append it in the 
	 * appropriate location.  
	 * 
	 * @param {String} html
	 * @param {Object Function} [options]
	 * @param {Function} [options.done] Called when all the scripts in the 
	 * sanitized HTML have run.
	 * @param {boolean} [options.asyncAll] If true, scripts loaded from the
	 * same domain will be loaded asynchronously. This can improve UI 
	 * responsiveness, but will delay completion of the scripts and may
	 * cause problems with some scripts, so it defaults to false.
	 */
	function sanitize(html,options,parentQ) {
		// each HTML fragment has it's own queue
		var queue = new Q(parentQ);
		var done;
		if(isFunction(options)) {
			done = options;
			options = {};
		} else {
			done = options && options.done;
		}
		options = options || {};
		// if a done callback is passed, append a script to call it
		if(isFunction(done)) {
			var doneId = nextId();
			callbacks[doneId] = done;
			html += '<script type="text/javascript">' + 
				TEMPLATE.replace(/%d/,doneId) + '</script>';
		}
		// for each tag, generate a function to load and eval the code and queue
		// themselves
		return html.replace(SCRIPT_TAGS,proxyTag);
		function proxyTag(element,openTag,code) {
			var src = (SRC_ATTR.exec(openTag)||[])[1];
			var id = nextId(), divId = DIV_PREFIX + id;
			var run;
			
			callbacks[id] = queueScript;
			function queueScript() {
				queue.push(run);
				delete callbacks[id]; 
			}
			
			if(src) {
				openTag = openTag.replace(SRC_ATTR,'');
				if(isXDomain(src)) {
					// will load async via script tag injection (eval()'d on
					// it's own)
					run = loadXDomain;
				} else {
					// can be loaded then eval()d
					run = options.asyncAll ? loadAsync : loadSync; 
				}
			} else {
				// just eval code and be done
				run = runInline;
				                  
			}
			function runInline() {
				captureHtml(code);
			}
			function loadSync() {
				$.ajax({
					url: src,
					type: 'GET',
					async: false,
					success: captureHtml	
				});						
			}
			function logAjaxError(xhr,status,error) {
				logError("<XHR for "+src+">",error);
				queue.resume();
			}
			function loadAsync() {
				queue.pause();
				$.ajax({
					url: src,
					type: 'GET',
					async: true,
					success: captureAndResume,
					error: logAjaxError
				});	
				function captureAndResume(script,status) {
					try {
						captureHtml(script);
					} catch(e) {
						logError(script,e);
					} finally {
						queue.resume();
					}
				}
			}
			function loadXDomain(cb) {
				var state = capture();
				queue.pause(); // pause the queue while the script loads
				$.ajax({
					url: src,
					type: 'GET',
					dataType: "script",
					success: captureAndResume,
					error: logAjaxError
				});
				function captureAndResume(xhr,st,error) {
					html(uncapture(state));
					queue.resume();
				}
			}
			function captureHtml(script) {
				html(captureWrite(script));
			}
			function html(markup,done) {
				$.replaceWith('#'+divId,sanitize(markup,done,queue));
			}
			return openTag + TEMPLATE.replace(/%d/,id) + 
				'</script><div style="display: none" id="'+divId+'"></div>';
		}
	}
	
	/**
	 * Sanitizes all the given fragments and replaces the given element with
	 * the result. The next fragment is not started until the previous fragment
	 * has executed completely.
	 * 
	 * @param {Array} fragments array of objects like this:
	 * {
	 *   html: '<p>My html with a <script...',
	 *   selector: '#anyValidJquerySelectorOrElement',
	 *   options: {} // optional, see #sanitize
	 * }
	 * @param {Function} [done] if provided, called when all fragments have 
	 * been processed.
	 */
	function sanitizeAll(fragments,done) {
		// create a queue for these fragments and make it the parent of each 
		// sanitize call
		var queue = new Q();
		each(fragments,enqueue);
		function enqueue(f) {
			queue.push(runAndReplace);
			function runAndReplace() {
				$.replaceWith(f.selector,sanitize(f.html,f.options,queue));				
			}
		}
		queue.push(done);
	}
	
	var name = 'writeCapture';
	var self = global[name] = {
		_original: global[name],
		noConflicts: function() {
			global[name] = this._original;
			return this;
		},
		// this is only for testing, please don't use these
		_forTest: {
			Q: Q,
			slice: slice,
			capture: capture,
			uncapture: uncapture,
			captureWrite: captureWrite
		},
		replaceWith: function(selector,content,options) {
			$.replaceWith(selector,sanitize(content,options));				
		},
		html: function(selector,content,options) {
			var el = $.$(selector);
			el.innerHTML ='<span/>';
			$.replaceWith(el.firstChild,sanitize(content,options));
		},	
		load: function(selector,url,options) {
			$.ajax({
				url: url,
				type: "GET",
				success: function(content) {
					self.html(selector,content,options);
				}
			});
		},
		sanitize: sanitize,
		sanitizeAll: sanitizeAll
	};
	
})(this.writeCaptureSupport,this,eval);