(function(global,globalEval) {
	global.writeCaptureSupport = {
		_original: global.writeCaptureSupport,
		noConflict: function() {
			global.writeCaptureSupport = this._original;
			return this;
		},
		// the code in this function is based on code from jQuery 1.3.2
		ajax: function(options) {
			if(options.dataType === 'script') {
				loadXDomain(options.url,options.success,options.error);
				return;
			}
			
			var xhr = newXhr(), requestDone = false, checkTimer;
			
			xhr.open("GET", options.url, options.async);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			xhr.setRequestHeader("Accept","text/javascript, application/javascript, */*");
			
			function checkXhr(){
				if ( !requestDone && xhr && (xhr.readyState == 4) ) {
					requestDone = true;

					if (checkTimer) {
						clearInterval(checkTimer);
						checkTimer = null;
					}

					var suc = false;
					try {
						// IE error sometimes returns 1223 when it should be 204 so treat it as success, see #1450
						suc = !xhr.status && location.protocol == "file:" ||
							( xhr.status >= 200 && xhr.status < 300 ) || 
							xhr.status == 304 || xhr.status == 1223;
					} catch(e){}

					if ( suc ) {
						options.success(xhr.responseText);
					} else {
						options.error(xhr,"error","xhr.status="+ xhr.status);
					}


					// Stop memory leaks
					if ( options.async )
						xhr = null;
				}
			};

			if ( options.async ) {
				// poll for changes
				checkTimer = setInterval(checkXhr, 20);
			}			
			
			try {
				xhr.send();
			} catch(e) {
				options.error(xhr, null, e);
			}			
			
			if(!options.async) {
				checkXhr();
			}
		},
		$: $,
		replaceWith: function(selector,content) {
			var i, len, el = $(selector),
				parent = el.parentNode || el.ownerDocument,
				work = document.createElement('div'),
				scripts = [],
				clearHTML = content.replace(/<script(?:.*?)>(.*?)<\/script>/g,function(all,code) {
					scripts.push(code);
					return "";
				});
			work.innerHTML = clearHTML;
			for(i = 0, len = work.childNodes.length; i < len; i++) {
				parent.insertBefore(work.childNodes.item(i).cloneNode(true),el);
			}
			parent.removeChild(el);
			for(i = 0, len = scripts.length; i < len; i++) {
				globalEval(scripts[i]);
			}
		}
	};
	
	function isElement(o) {
		return o && o.nodeType == 1;
	}
	
	function $(s) {
		if(isElement(s)) return s;
		
		// trim the selector
		s = s && s.replace(/^\s*/,'').replace(/\s*$/,'');
		
		if(!/^#[a-zA-Z0-9_:\.\-]+$/.test(s)) 
			throw "nolib-support only allows id based selectors. selector=" + s;
		
    	return document.getElementById(s.substring(1));
	}
	
	var newXhr = global.ActiveXObject ? function() {
		return new ActiveXObject("Microsoft.XMLHTTP");
	} : function () {
		return new XMLHttpRequest();
	};
	
	// the code in this function is copied and slightly modified from jQuery 1.3.2
	function loadXDomain(url,success) {
		// TODO what about scripts that fail to load? bad url, etc.?
		var head = document.getElementsByTagName("head")[0];
		var script = document.createElement("script");
		script.src = url;

		var done = false;

		// Attach handlers for all browsers
		script.onload = script.onreadystatechange = function(){
			if ( !done && (!this.readyState ||
					this.readyState == "loaded" || this.readyState == "complete") ) {
				done = true;
				success();

				// Handle memory leak in IE
				script.onload = script.onreadystatechange = null;
				head.removeChild( script );
			}
		};		
		
		head.appendChild(script);
	}

})(this,eval);