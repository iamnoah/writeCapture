/**
 * writeCapture.js v0.9.5-SNAPSHOT
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
			    // jQuery 1.4? has a bug in replaceWith so we can't use it directly
			    var el = jQuery(selector)[0];
				var next = el.nextSibling, parent = el.parentNode;

				jQuery(el).remove();

				if ( next ) {
					jQuery(next).before( content );
				} else {
					jQuery(parent).append( content );
				}
			}
		};
	})(global.jQuery);
	
	// utilities
	function each(array,fn) {
		for(var i =0, len = array.length; i < len; i++) { 
			if( fn(array[i]) === false) return; 
		}
	}	
	function isFunction(o) {
		return Object.prototype.toString.call(o) === "[object Function]";
	}
	function isString(o) {
		return Object.prototype.toString.call(o) === "[object String]";
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
	
	function SubQ(parent) {
		this._queue = [];
		this._children = [];
		this._parent = parent;
		if(parent) parent._addChild(this)		
	}
	
	SubQ.prototype = {
		_addChild: function(q) {
			this._children.push(q);
		},
		push: function (task) {
			this._queue.push(task);
			this._bubble('_doRun');
		},
		pause: function() {
			this._bubble('_doPause');
		},
		resume: function() {
			this._bubble('_doResume');
		},
		_bubble: function(name) {
			var root = this;
			while(!root[name]) {
				root = root._parent;
			}
			return root[name]();
		},
		_next: function() {
			if(any(this._children,runNext)) return true;
			function runNext(c) {
				return c._next();
			}
			var task = this._queue.shift();
			if(task) {
				task();
			}
			return !!task;
		}
	};
	
	/**
	 * Provides a task queue for ensuring that scripts are run in order.
	 *
	 * The only public methods are push, pause and resume.
	 */
	function Q(parent) {
		if(parent) {
			return new SubQ(parent);
		}
		SubQ.call(this);
		this.paused = 0;
	}
	
	Q.prototype = (function() {
		function f() {}
		f.prototype = SubQ.prototype;
		return new f();
	})();
	
	Q.prototype._doRun = function() {
		if(!this.running) {
			this.running = true;
			try {
				while(!this.paused && this._next());
			} finally {
				this.running = false;
			}
		}
	};
	Q.prototype._doPause= function() {
		this.paused++;
	};
	Q.prototype._doResume = function() {
		this.paused--;
		this._doRun();
	};
	
	// TODO unit tests...
	function MockDocument() { }
	MockDocument.prototype = {
		_html: '',
		open: function( ) { 
			this._opened = true;
			if(this._delegate) {
				this._delegate.open();
			}
		},
		write: function(s) { 
			if(this._closed) return; 
			this._written = true;
			if(this._delegate) {
				this._delegate.write(s);
			} else {
				this._html += s;
			}
		}, 
		writeln: function(s) { 
			this.write(s + '\n');
		}, 
		close: function( ) { 
			this._closed = true;
			if(this._delegate) {
				this._delegate.close();
			}
		}, 
		copyTo: function(d) { 
			this._delegate = d;
			d.foobar = true;
			if(this._opened) {
				d.open();
			}
			if(this._written) {
				d.write(this._html); 
			}
			if(this._closed) {
				d.close();
			}
		}
	};
	
	function capture() {
		var state = {
			write: global.document.write,
			writeln: global.document.writeln,
			getEl: global.document.getElementById,
			tempEls: [],
			finish: function() {
				each(this.tempEls,function(it) {
					var real = global.document.getElementById(it.id);
					if(!real) throw "No element with id: " + it.id;
					each(it.el.childNodes,function(it) {
						real.appendChild(it);
					});
					if(real.contentWindow) {
						// TODO why is the setTimeout necessary?
						global.setTimeout(function() {
							it.el.contentWindow.document.
								copyTo(real.contentWindow.document);
						},1);
					}
				});
			},
			out: ''
		};
		global.document.write = replacementWrite;
		global.document.writeln = replacementWriteln;
		if(self.proxyGetElementById) {
			global.document.getElementById = getEl;			
		}
		function replacementWrite(s) {
			state.out +=  s;
		}
		function replacementWriteln(s) {
			state.out +=  s + '\n';
		}
		function makeTemp(id) {
			var t = global.document.createElement('div');
			state.tempEls.push({id:id,el:t});
			// mock contentWindow in case it's supposed to be an iframe
			t.contentWindow = { document: new MockDocument() };
			return t;
		}
		function getEl(id) {
			var result = state.getEl.call(global.document,id);
			return result || makeTemp(id);
		}
		return state;
	}
	function uncapture(state) {
		global.document.write = state.write;
		global.document.writeln = state.writeln;
		if(self.proxyGetElementById) {
			global.document.getElementById = state.getEl;
		}
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
		return state;
	}
	
	// copied from jQuery
	function isXDomain(src) {
		var parts = /^(\w+:)?\/\/([^\/?#]+)/.exec(src);
		return parts && ( parts[1] && parts[1] != location.protocol || parts[2] != location.host );
	}
	
	function attrPattern(name) {
		return new RegExp(name+'=(?:(["\'])([\\s\\S]*?)\\1|([^\\s>]+))','i');
	}
	
	function matchAttr(name) {
		var regex = attrPattern(name);
		return function(tag) {
			var match = regex.exec(tag) || [];
			return match[2] || match[3];
		};
	}
	
	var SCRIPT_TAGS = /(<script[\s\S]*?>)([\s\S]*?)<\/script>/ig, 
		SRC_REGEX = attrPattern('src'),
		SRC_ATTR = matchAttr('src'),
		TYPE_ATTR = matchAttr('type'),
		LANG_ATTR = matchAttr('language'),
		GLOBAL = "__document_write_ajax_callbacks__",
		DIV_PREFIX = "__document_write_ajax_div-",
		TEMPLATE = "window['"+GLOBAL+"']['%d']();",
		callbacks = global[GLOBAL] = {},
		TEMPLATE_TAG = '<script type="text/javascript">' + TEMPLATE + '</script>',
		global_id = 0;
	function nextId() {
		return (++global_id).toString();
	}
	
	function normalizeOptions(options,callback) {
		var done;
		if(isFunction(options)) {
			done = options;
			options = null;
		}
		options = options || {};
		done = done || options && options.done;
		options.done = callback ? function() {
			callback(done);
		} : done;
		return options;
	}
	
	// The global Q synchronizes all sanitize operations. 
	// The only time this synchronization is really necessary is when two or 
	// more consecutive sanitize operations make async requests. e.g.,
	// sanitize call A requests foo, then sanitize B is called and bar is 
	// requested. document.write was replaced by B, so if A returns first, the 
	// content will be captured by B, then when B returns, document.write will
	// be the original document.write, probably messing up the page. At the 
	// very least, A will get nothing and B will get the wrong content.
	var GLOBAL_Q = new Q();
	
	var debug = [];
	var logDebug = window._debugWriteCapture ? function() {} : 
		function (type,src,data) {
			debug.push({type:type,src:src,data:data});
		};
	
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
		var queue = parentQ && new Q(parentQ) || GLOBAL_Q;
		options = normalizeOptions(options);
		var done = options.done;
		var doneHtml = '';
		
		// if a done callback is passed, append a script to call it
		if(isFunction(done)) {
			var doneId = nextId();
			callbacks[doneId] = function() {
				queue.push(done);
				delete callbacks[doneId];
			};
			// no need to proxy the call to done, so we can append this to the 
			// filtered HTML
			doneHtml = TEMPLATE_TAG.replace(/%d/,doneId);
		}
		// for each tag, generate a function to load and eval the code and queue
		// themselves
		return html.replace(SCRIPT_TAGS,proxyTag) + doneHtml;
		function proxyTag(element,openTag,code) {
			var src = SRC_ATTR(openTag),
				type = TYPE_ATTR(openTag) || '',
				lang = LANG_ATTR(openTag) || '',
				isJs = (!type && !lang) || // no type or lang assumes JS
					type.toLowerCase().indexOf('javascript') !== -1 || 
					lang.toLowerCase().indexOf('javascript') !== -1;
			
			logDebug('replace',src,element);
			var id = nextId(), divId = DIV_PREFIX + id;
			var run;
			
			if(!isJs) {
			    return element;
			}
			
			// fix for the inline script that writes a script tag with encoded 
			// ampersands hack (more comon than you'd think)
			if(src && isFunction(self.fixUrls)) {
			    src = self.fixUrls(src);
			}
			
			callbacks[id] = queueScript;
			function queueScript() {
				queue.push(run);
				delete callbacks[id]; 
			}
			
			if(src) {
				openTag = openTag.replace(SRC_REGEX,'');
				if(isXDomain(src)) {
					// will load async via script tag injection (eval()'d on
					// it's own)
					run = loadXDomain;
				} else {
					// can be loaded then eval()d
					if(options.asyncAll) {
						run = loadAsync();
					} else {
						run = loadSync; 
					}
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
					success: function(html) {
						captureHtml(html);
					}	
				});
			}
			function logAjaxError(xhr,status,error) {
				logError("<XHR for "+src+">",error);
				queue.resume();
			}
			function setupResume() {
				var id = nextId();
				callbacks[id] = function() {
					queue.resume();
					delete callbacks[id];
				};
				return TEMPLATE_TAG.replace(/%d/,id);
			}
			function loadAsync() {
				var ready, scriptText, resume = setupResume();
				function captureAndResume(script,status) {
					if(!ready) {
						// loaded before queue run, cache text
						scriptText = script;
						return;
					}
					try {
						captureHtml(script, resume);
					} catch(e) {
						logError(script,e);
					}
				}
				// start loading the text
				$.ajax({
					url: src,
					type: 'GET',
					async: true,
					success: captureAndResume,
					error: logAjaxError
				});				
				return function() {
					ready = true;
					if(scriptText) {
						captureHtml(scriptText, resume);
					} else {
						queue.pause();	
					}
				};
			}
			function loadXDomain(cb) {
				var state = capture();
				queue.pause(); // pause the queue while the script loads
				logDebug('pause',src);
				$.ajax({
					url: src,
					type: 'GET',
					dataType: "script",
					success: captureAndResume,
					error: logAjaxError
				});
				function captureAndResume(xhr,st,error) {
					logDebug('out', src, state.out);
					html(uncapture(state), setupResume());
					state.finish();
					logDebug('resume',src);
				}
			}
			function captureHtml(script, cb) {
				var state = captureWrite(script);
				html(state.out, cb);
				state.finish();
			}
			function html(markup,cb) {
				$.replaceWith('#'+divId,sanitize(markup,null,queue) + (cb || ''));
			}
			return openTag + TEMPLATE.replace(/%d/,id) + 
				'</script><div style="display: none" id="'+divId+'"></div>';
		}
	}
	
	/**
	 * Sanitizes all the given fragments and calls action with the HTML.
	 * The next fragment is not started until the previous fragment
	 * has executed completely.
	 * 
	 * @param {Array} fragments array of objects like this:
	 * {
	 *   html: '<p>My html with a <script...',
	 *   action: function(safeHtml,frag) { doSomethingToInject(safeHtml); },
	 *   options: {} // optional, see #sanitize
	 * }
	 * Where frag is the object.
	 * 
	 * @param {Function} [done] Optional. Called when all fragments are done.
	 */
	function sanitizeSerial(fragments,done) {
		// create a queue for these fragments and make it the parent of each 
		// sanitize call
		var queue = GLOBAL_Q;
		each(fragments, function (f) {
			queue.push(run);
			function run() {
				f.action(sanitize(f.html,f.options,queue),f);
			}
		});
		if(done) {
			queue.push(done);		
		}
	}
	
	var name = 'writeCapture';
	var self = global[name] = {
		_original: global[name],
		/**
		 */
		fixUrls: function(src) {
		    return src.replace(/&amp;/g,'&');
		},
		noConflict: function() {
			global[name] = this._original;
			return this;
		},
		debug: debug,
		/**
		 * Enables a fun little hack that replaces document.getElementById and
		 * creates temporary elements for the calling code to use.
		 */
		proxyGetElementById: false,
		// this is only for testing, please don't use these
		_forTest: {
			Q: Q,
			GLOBAL_Q: GLOBAL_Q,
			$: $,
			matchAttr: matchAttr,
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
		sanitizeSerial: sanitizeSerial
	};
	
})(this.writeCaptureSupport,this,eval);