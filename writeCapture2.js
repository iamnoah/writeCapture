/**
 * Totaly rewritten writeCapture, based on element.write.
 *
 * Usage:
 *
 * 	writeCapture(targetElement).
 * 		write(someHtml).
 * 		close(); // must be sure to close()
 *
 * Script tags in anything written will automatically be captured, such
 * that document.write is redirected into the element.
 */
(function(define){

	var console = this.console || {log:function(){}};

	// feature test for how we create script tags
	var scriptEval = (function() {
		var script = document.createElement("script");
		var id = "script" + (new Date).getTime();
		var root = document.documentElement;

		script.type = "text/javascript";
		try {
			script.appendChild( document.createTextNode( "window." + id + "=1;" ) );
		} catch(e){}

		root.insertBefore( script, root.firstChild );

		// Make sure that the execution of code works by injecting a script
		// tag with appendChild/createTextNode
		// (IE doesn't support this, fails, and uses .text instead)
		if ( window[ id ] ) {
			delete window[ id ];
			return true;
		}
		return false;
	})();

	// will be set by define()
	var elementWrite;

	/**
	 * This is the public one. Creates a writer for element.
	 * onDone is called when all writing finishes.
	 *
	 * Depends on elementWrite, which gets set by the define call
	 * at the end.
	 */
	function writerFor(element,onDone) {
		var writer, capturing, script;

		onDone = onDone || function() {};

		// add a set of listeners that will handle script tags and
		// capture document.write
		writer = elementWrite.toElement(element,pausable({
			start: function(tag,attrs,unary,state) {
				if(tag.toLowerCase() === 'script') {
					console.log('WC element:',element,
						'start script. attrs:',attrs,this.id);
					script = '';
					capturing = attrs || {};
					return false;
				}
			},
			chars: function(text,state) {
				if(capturing) {
					console.log('WC element:',element,'chars:',text,this.id);
					script += text;
					return false;
				}
			},
			end: function(tag,state) {
				if(capturing) {
					var attrs = capturing;
					capturing = false;
					captureScript(script,attrs,state.stack.last(),writer);
					return false;
				}
			},
			comment: function(text,state) {
				return false;
			},
			// special pausable handler - fires when queue is exhausted
			done: onDone
		}));

		return writer;
	}

	/**
	 * Creates a script tag from script (the code) & attrs and appends
	 * it to parent. The writer is paused while the script loads and
	 * runs, then resumed after it has finished.
	 */
	function captureScript(script,attrs,parent,writer) {
		// Create a new writer for the script to use so we
		// can pause the current writer.
		var newWriter = writerFor(parent,doResume), restore;

		console.log('WC captureScript attrs:',attrs,'body:',script,
			'in parent:',parent);

		// if the script is in fact an inline script, it should
		// finish before any other writer actions queue, so it will
		// be like we never paused
		writer.handle('pause');

		// We have to let any current script finish (and queue up writes)
		// before we can redirect and run the next script.
		// This could be a problem for scripts that expect the new script
		// tag to block script execution (impossible for us)
		setTimeout(function() {
			restore = redirect(getDoc(parent),newWriter);
			// when the script has loaded, queue up the close/done
			// (script may have paused its writer)
			exec(script,attrs,parent,function() {
				newWriter.close();
			});
		},25);

		// when the writter is closed and fully written out,
		// restore doc.write and resume writing from this
		// writer's queue
		function doResume() {
			restore();
			writer.handle('resume');
		}
	}

	/**
	 * Executes scripts by creating a script tag and inserting it into
	 * parent.
	 * @param script the script body (code).
	 * @param attrs the script attributes. May include src.
	 * @param parent the element to append the script to.
	 * @param cb optional callback to call when script is loaded.
	 */
	function exec(script,attrs,parent,cb) {
		var doc = getDoc(parent),
			el = doc.createElement('script'),
			name, value;
		for ( var attr in attrs ) {
			name = attrs[attr].name;
			value = attrs[attr].value;

			if(writerFor.fixUrls && name === 'src') {
				value = writerFor.fixUrls(value);
			}
			el.setAttribute( name, value );
		}

		if(script) {
			if ( scriptEval ) {
				el.appendChild( doc.createTextNode( script ) );
			} else {
				el.text = script;
			}
		}

		if(cb && el.src) {
			el.onload = el.onreadystatechange = function( _, isAbort ) {

				if ( isAbort || !el.readyState || /loaded|complete/.test( el.readyState ) ) {

					// Handle memory leak in IE
					el.onload = el.onreadystatechange = null;

					// Dereference the script
					el = undefined;

					// Callback if not abort
					if ( !isAbort ) {
						cb();
					}
				}
			};
		}

		parent.appendChild(el);
		// if it was an inline script, it's done now
		if(cb && !el.src) {
			cb();
		}
	}

	/**
	 * Redirects the document's document.write/writeln
	 * to writer.
	 *
	 * @return a function to restore the original functions.
	 */
	function redirect(document,writer) {
		var original = {
			write: document.write,
			writeln: document.writeln
		};
		document.write = function(s) {
			// if the writer is paused, this queues the write
			writer.handle('write',[s]);
		};
		document.writeln = function(s) {
			document.write(s+'\n');
		};

		return function() {
			document.write = original.write;
			document.writeln = original.writeln;
		};
	}

	var ids = 0;
	// adds pause and resume methods to listeners and returns a new set of
	// listeners that will queue their events when paused
	function pausable(listeners) {
		var queue = [], paused, id = ids++;
		return {
			pause: function() {
				console.log('WC PAUSE',id);
				paused = true;
			},
			resume: function() {
				console.log('WC RESUME',id,queue.slice(0));
				paused = false;
				while(!paused && queue.length) {
					var next = queue.shift();
					this.writer.handle(next[0],next[1]);
				}
			},
			start: function(tag,attrs,unary,state) {
				console.log('WC start',paused,'args',tag,attrs,unary,state,id);
				if(paused) {
					queue.push(['start',[tag,attrs,unary]]);
					return false;
				} else {
					return listeners.start(tag,attrs,unary,state);
				}
			},
			chars: function(text,state) {
				console.log('WC chars',paused,'args',text,state,id);
				if(paused) {
					queue.push(['chars',[text]]);
					return false;
				} else {
					return listeners.chars(text,state);
				}
			},
			end: function(tag,state) {
				console.log('WC end',paused,'args',tag,state,id);
				if(paused) {
					queue.push(['end',[tag]]);
					return false;
				} else {
					return listeners.end(tag,state);
				}
			},
			comment: function(text,state) {
				if(paused) {
					queue.push(['comment',[text]]);
					return false;
				} else {
					return listeners.comment(text,state);
				}
			},
			write: function(s) {
				console.log('WC queue.write',paused,id);
				if(paused) {
					queue.push(['write',[s]]);
					return false;
				} else {
					this.writer.write(s);
					return false;
				}
			},
			close: function() {
				console.log('WC close',paused,id);
				if(paused) {
					queue.push(['close',[]]);
					return false;
				} else if(listeners.done) {
					return listeners.done();
				}
			}
		};
	}

	function getDoc(element) {
		return element.ownerDocument ||
			element.getOwnerDocument && element.getOwnerDocument();
	}

	function object(obj) {
		function F() {}
		F.prototype = obj;
		return new F;
	}


	// export writerFor
	define(['element.write'],function(elWrite) {
		elementWrite = writerFor.elementWrite = elWrite;
		writerFor.fixUrls = function(src) {
		    return src.replace(/&amp;/g,'&');
		};
		return writerFor;
	});
})(typeof define == 'function' ? define : function(deps,factory) {
	if (typeof exports === 'object') {
		module.exports = factory(require(deps[0]));
	} else {
		this.writeCapture = factory(this.elementWrite);
	}
});
