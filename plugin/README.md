# jquery.writeCapture.js #

The writeCapture.js jQuery plugin provides an easy way to utilize 
[writeCapture.js](http://github.com/iamnoah/writeCapture) the jQuery way. e.g.,

    $('#foo').writeCapture().load('someUrl.php',function() {
		alert("loaded safely!");
	}).html('Safe! - Loading').endCapture().html('Unsafe!');

All HTML manipulations are proxied by the plugin and filtered through 
writeCapture before injection, so all calls chained off of the call to 
`writeCapture()` will be "safe". i.e., scripts containing `document.write` 
calls will be captured and the content injected in the appropriate place.

The method `endCapture()` only needs to be called if you intend to chain 
further HTML manipulation methods and do not want the HTML to be sanitized 
by writeCapture.

`load` is not the only function that has a callback. Due to the fact that 
scripts on another domain must be loaded asynchronously, all HTML 
manipulation method calls chained off of writeCapture() take a callback
parameter:

    $('#foo').writeCapture().html(someHtmlWithXDomainScripts,function() {
		this.addClass('loaded'); // this is jQuery i.e., $('#foo')
	}).doSomethingElse();
	
Note that if any script in the HTML (or resulting HTML) is on another 
domain, `doSomethingElse()` will execute before the callback, otherwise the
callback will execute immediately, followed by the remainder of the chain.
If you are not sure whether or not the HTML contains cross domain scripts, you
should assume that it does and chain dependent actions in the callback.

If you only need to call a single method, you can pass the method name and
arguments to `writeCapture()` and not bother with chaining:

    $('#foo').writeCapture('html,theHtml,callback).doSomethingNormal();

Here `doSomethingNormal()` is meant to indicate that any chained methods will
not be proxied and/or sanitized as they would when chaining off of a 
no-argument call to `writeCapture()`.