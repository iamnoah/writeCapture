#  What is writeCapture.js? #

It's been referred to as ["the Jesus Script"][jesus].
Why? Probably because it will save your site from old, ugly, but still 
necessary 3rd party scripts that use `document.write`. 

Sometimes we are forced to use a third party script or markup that we simply 
cannot change (usually an Ad server). While our websites are sleek and snappy 
with a nearly pristine codebase and progressive enhancement and Ajax 
everywhere, many 3rd party libraries are still using tables for layout and 
the dreaded, *evil* `document.write` method.

What makes `document.write` so evil is that it is only "useful" for scripts inside
the body tag that are processed while the page is loading. If document.write is
called anytime after page load, it wipes out all the existing page content. 
That makes it very difficult to dynamically refresh content containing 
`document.write` calls.

Fortunately for you, difficult is not impossible, and writeCapture.js has 
already written (and extensively tested) the difficult part for you. All 
you have to do is give it the offending evil HTML and it will return nice
clean HTML, safe for injection into the document.

# Usage #

## Automatic Asynchronous Writes ##

Perhaps the most common use for writeCapture is to prevent ads and other 3rd 
party scripts that use `document.write` from blocking the DOM while the page 
loads. writeCapture has a special method specifically for this case. Simply call

    $.writeCapture.autoAsync();

at some point in the document before the scripts that use `document.write`.

You can also pass a function to be called when all the async writes have 
finished:

    $.writeCapture.autoAsync(function() {
    	alert('Ads loaded!'); // don't do this though, it would be annoying
    });

(Actually you can pass all the options you'd pass to any writeCapture call,
see below for details).

Note that at this time, `autoAsync` is only supported when jQuery is available.
However, you can easily add support to you page by defining 
`writeCaptureSupport.onLoad`. See "Implementing writeCaptureSupport" below.

It's important to note that this will not prevent a cross-domain script tag 
placed directly in the page from DOM blocking if the external server is down, 
or running slow due to heavy load. For example, in the following markup, the
browser will block at the script trying to load foo.js from example.com.

    <script src="http://example.com/foo.js" ...

However, if your script uses document.write to write out the external script 
tag like (which is actually quite common) the browser will *not* block:

    <script>document.write('<scrip'+'t src="http://example.com/foo.js"> </s'+'cript>');</script>

If you would rather not add more code using `document.write` you can use a 
placeholder instead:

    <div id="placeholder"> </div>
    
    <script> 
    $(document).ready(function() {
    	$('#placeholder').writeCapture().html('<script src="http://example.com/foo.js"> </script>');
    });
    </script>

Note that when using the placeholder method, calling `autoAsync` is unnecessary.

## Other Usage ##

If `autoAsync` isn't working for your script, or you have another use case like 
Ajax loading HTML containing scripts, writeCapture provides a flexible API to
accomplish this.

The easiest way to use writeCapture is through the 
[jQuery plugin](/iamnoah/writeCapture/tree/master/plugin/):

    $('#target-el').writeCapture().html('<script src="http://evilAdServer.com/doSomeDocWrite.js"> </script>');

The remainder of this documentation will describe somewhat lower level use 
cases and go into the finer details of the library.

In the examples below, note that `writeCapture.sanitize` doesn't execute scripts,
the scripts are executed by jQuery and the browser when the HTML returned by 
`sanitize` is inserted into the page via `html()`, `replaceWith()` or any 
other jQuery HTML manipulation method. You don't have to use jQuery, but your
library of choice does need to be able to execute scripts inside an HTML
fragment.

## Inline and same domain scripts ##

Inline scripts are always executed synchronously. Scripts on the same domain 
are also downloaded and executed synchronously by default.

    var html1 = '<div>Some HTML with <script type="text/javascript">document.write("scripts");</script> in it.</div>';
    
    $('#someElement').html(writeCapture.sanitize(html1));
	// $('#someElement').html() === '<div>Some HTML with scripts in it.</div>'

## XDomain scripts (or asyncAll: true) ##

If any of the scripts being loaded is on another domain (or you pass asyncAll: true), they will be 
downloaded and run asynchronously, so any actions that script takes, including
document.write calls, will happen later. If you need to take some action after 
the scripts run, use the done callback:
 
    // http://example.com/xdomain.js = document.write('a script on another domain');
    
    var html2 = '<div>Some HTML with <script type="text/javascript" src="http://example.com/xdomain.js"> </script>.</div>';
    
    $('#someElement').html(writeCapture.sanitize(html2,function () {
		// $('#someElement').html() === '<div>Some HTML with a script on another domain.</div>'
	}));
	// $('#someElement').html() == '<div>Some HTML with <script ...' (script hasn't run yet)
	
Scripts on the same domain can also be downloaded asynchronously, if desired:

    // local.js = document.write('a local script, loaded async');
    
    var html3 = '<div>Some HTML with <script type="text/javascript" src="local.js"> </script>.</div>';
    
    $('#someElement').html(writeCapture.sanitize(html2,{
		asyncAll: true, // same domain scripts will be loaded async
		done: function () {
	    	// $('#someElement').html() === '<div>Some HTML with a local script, loaded async.</div>'
	    }
    }));

Note that this option does not affect inline scripts, which are always 
executed immediately.
    
## Multiple HTML Fragments ##

writeCapture uses an internal queue to ensure that all scripts are run in the 
correct order, so you don't need to work about multiple calls interfering with
each other. e.g.,

    writeCapture.sanitize()

## Convenience Functions ##

`writeCapture.html` and `writeCapture.replaceWith` behave similarly to the 
same functions in jQuery. `html` sanitizes the content and replaces the given 
element's innerHTML. `replaceWith` sanitizes and replaces the entire element
with the result.

`writeCapture.load` is similar to jQuery's load method but does not currently
support using a selector to filter what is injected. The content from the 
given URL will be sanitized.

    /*
    	$('body).html() === 
    	'<div id="foo"> </div><div id="bar"> </div>'
    */    
    
    writeCapture.html('#foo',html1,function() {
    	/*
			$('body).html() === 
    		'<div id="foo"><div>Some HTML with scripts in it.</div></div><div id="bar"> </div>';
    	*/    	
    });

    writeCapture.replaceWith('#bar',html2,function() {
    	/*
			$('body).html() === 
    		'<div id="foo"><div>Some HTML with scripts in it.</div></div><div>Some HTML with a script on another domain.</div>';
    	*/    	
    });
    
    /*
    	foo.php returns 
    	<div>Some HTML with <script type="text/javascript">document.write("scripts");</script> in it.</div>
    */
    writeCapture.load('#foo','foo.php',function() {
		// $('#foo').html() === '<div>Some HTML with scripts in it.</div>'	
	});

Note that all of these functions will work using nolib-support (see below),
but only id based selectors will be supported. You can also pass the element
itself. If jQuery is used, any jQuery selector is allowed, but only the 
first matched element will be affected.

# Dependencies #

writeCapture.js was developed using jQuery 1.3.2, but should work with most 
versions. We recommend you use jQuery, because it's pretty great, however, 
if that's not possible, there are a few options:

## nolib-support ##

support/nolib-support.js provides a bare bones implementation of the support
functions jQuery would otherwise provide and only adds about 800 bytes when
Gzipped. The combined file is still under 2.5k compressed, so this is generally
the second best option to using jQuery.

To use nolib-support, just grab the latest writeCapture-x.x.x.-nolib.min.js 
from the downloads section. It already includes writeCapture.js, so it's the 
only file you need. If you'd like the unminified source for debugging, simply 
include nolib-support.js before writeCapture.js.

Note that nolib does not implement `onLoad`, which is required for `autoAsync`.

## Implementing writeCaptureSupport ##

If you don't want to use jQuery and you already use 
another Ajax library, chances are you can easily wrap it to provide the 
functions writeCapture needs and save a few bytes.

writeCapture needs 3 support functions. You provide them by defining a 
`writeCaptureSupport` object:

    window.writeCaptureSupport = {
    	ajax: function(options) { /*...*/ },
		$: function(selector) { /* ... */ },
    	replaceWith: function(selector,content) { /*...*/ }
    };

### `ajax` ###

`ajax` must provide a subset of the functionality of 
[jQuery.ajax](http://docs.jquery.com/Ajax/jQuery.ajax#options). The following
options are used:

    {
    	url: url, // the url to load
    	type: 'GET', // will always be GET
    	dataType: "script", // will be "script" or "text"
    	async: true/false,
    	success: callback(text), // called on sucess
    	error: callback(xhr,status,error) // called on error
    }

Implementations can assume that type is always GET, but the parameter will be 
passed regardless. If dataType === "script", then it is assumed that the 
script will be loaded and executed asynchronously via 
[script tag injection](http://jaybyjayfresh.com/2007/09/17/using-script-tags-to-do-remote-http-calls-in-javascript/).
dataType will only be set to "script" if the script being loaded is on another 
domain, otherwise it will be "text" and the response must not be evaluated as a script.

The success callback should be passed the text of the script (if 
dataType:"script", the text will not be used and can be omitted). The error
callback should be passed 3 parameters, the third being the Error that occurred.
The first two parameters are ignored. Either success or error must eventually 
be called for each call to `ajax`.

### `replaceWith` ###

`replaceWith` is equivalent to jQuery's 
[replaceWith](http://docs.jquery.com/Manipulation/replaceWith#content).
The key feature is that the second parameter will always be an HTML string and
any script tags it contains must be executed. For selector support, see `$` 
below.

### `$` ###

Resolves a selector to a *single* element. At a minimum, ID based selectors
must be supported. If an `Element` is passed, it should be returned unmodified. 
This should be the same function used by `replaceWith` to resolve the element
to replace.

    writeCaptureSupport.$('#foo') == document.getElementById('foo')
    writeCaptureSupport.$(document.body) == document.body

This function (and `replaceWith`) should throw an informative error if an 
unsupported selector is given.

### onLoad (optional) ###

Equivalent to jQuery's `$(document).ready()`, Prototype's 
`Event.observe(window, 'load')`, dojo's `dojo.addOnLoad()` and Moo Tool's
`window.addEvent('domready')` or plain old `window.onload = `.
Takes a function and calls it when the document has loaded.

This method is optional but is required to use `autoAsync`. If you are using
nolib-support.js, which does not implement `onLoad`, you can implement it easily:

    writeCaptureSupport.onLoad = function(fn) {
        // note that this is a poor implementation, use/copy a framework
        window.onload = fn;
    };

### copyAttrs (optional) ###

Used by `proxyGetElementById` to copy attributes from the proxy div to 
the real element. If not present, the attributes are not copied, which 
usually wont matter.

# Options & Hacks #

All writeCapture calls accept an second (or only, for `autoAsync`) argument for
options. e.g.,

    writeCapture.sanitize(html,{autoAsync: true, done:...});

You can also pass just a function, which is equivalent to:

    writeCapture.sanitize(html,{done:yourFunc});

Note that all hacks and options can be configured globally and per call. Per call 
settings override global settings. e.g.,

    writeCapture.proxyGetElementById = true;
    // getElementById is proxied
    writeCapture.sanitize(html);
    // getElementById is NOT proxied
    writeCapture.sanitize(html,{proxyGetElementById: false});
    // there are many options
    writeCapture.sanitize(html,{
        fixUrls: myFixUrlsFn,
        writeOnGetElementById: true,
        done: function() { alert('All done!'); },
        asyncAll: true
    });

## done ##

The done callback as described in the Usage examples above. If done is set
globally, it will be called after every single script tag. We're not sure how
that might be useful, but it is an option. Let us know if you find a use for 
it.

## asyncAll ##

As described in the examples, setting this to true will cause scripts on the 
same domain to be loaded async, which might help perceived performance.

## DOM manipulation mixed with `document.write` - proxyGetElementById ##

Amazingly enough, some scripts will mix DOM manipulation methods like 
`element.appendChild` with `document.write`. In situations like these, there
isn't a lot writeCapture can do, however there is a hack that may help some of
your scripts:

     writeCapture.proxyGetElementById = true;
     // or for the jQuery plugin:
     jQuery.writeCapture.proxyGetElementById = true;
     // or per call
     writeCapture.sanitize(theHtml,{proxyGetElementById:true});
     $(something).writeCapture().html(theHtml,{proxyGetElementById:true});

Enabling the hack will proxy `document.getElementById` and return a temporary 
element if no element with that id exists. Once the script's HTML has been 
written, the contents of the temporary element are appended to the real 
element.

### writeOnGetElementById ###

For some scripts, the proxy approach will fail. For example, a script that 
tries to access the parentNode property will fail because the proxy node has 
no parent. In these extreme cases, `writeOnGetElementById` can help, although 
it has it's own set of problems and should only be used a last resort. It is enabled 
and disabled in the same way as `proxyGetElementById`:

    writeCapture.writeOnGetElementById = true;

### Implementation - Mock iframes ###

Some scripts even go so far as to create iframes using DOM manipulation and 
then write to them using `document.write`. Ironically, these writes are 
perfectly safe because the new iframe is a clean slate. The problem arises when
an iframe is written using `document.write` then retrieved by id using 
`getElementById`. With `proxyGetElementById` enabled, the call will return an 
element, however it returns a plain div, not an iframe. This is a problem 
because an iframe has a special property called `contentWindow` with its own
document. So in addition to creating a proxy div element for missing elements,
we also have to mock the `contentWindow` property and provide a document for 
the script to write to. Again, there are surely cases where this approach will
fail, but it will help in many.

`writeOnGetElementById` does not use mock iframes.

## fixUrls - URLs with encoded ampersands ##

A common hack used for browser compatibility goes something like this:

    <script type="text/javascript"><!--
       document.write('<scr'+'ipt type="text/javascript" src="http://foo.com/bar?baz=qux&amp;quxx=quxxx> </sc'+'ript>');
    </script>

You'll notice that the ampersand in the URL is encoded, which will prevent 
writeCapture from loading the script correctly. To remedy this, all script URLs
are run through `writeCapture.fixUrls(url)` which replaces encoded ampersands 
with the real thing. It's possible that this could mess up a perfectly valid 
URL, so you can replace the fixUrls function with one of your own or set it to
`null` to prevent the hack all together. The function is passed the script URL
and is expected to return the real path.

# Satisfied Customers

 * [newsweek.com](http://newsweek.com) [uses][jesus] writeCapture.js.
 
# Caveats/Limitations #
 
* If any of the included scripts are on another domain, they will have to be 
  loaded asynchronously via script tag injection. Subsequent scripts in the 
  HTML will be blocked, so order will be preserved, but this means that not 
  all scripts may have yet run after the HTML is injected. This means that if 
  your script depends on all the scripts in the HTML having run, it should 
  utilize the done() callback.
  
* Scripts that assume that they are the last element in the document will 
  probably not function properly. This is rare, but if a script is uncouth 
  enough to use document.write, it's a possibility.  

# Version History #

## 1.0.5 ##

  * Hacks:
  
    * Updated `proxyGetElementById` will attempt to copy attributes from the proxy 
    when jQuery is present. Should improve compatibility in some cases.
    
    * `writeOnGetElementById` for when proxying isn't enough.
    
  * New Experimental Feature: `autoAsync`
  
  * All options and hacks can now be set globally and/or per call.
  
  * No more eval! Fixes a problem in IE where `var` variables were not visible 
  to other scripts.

## 1.0 ##

  * If it's good enough for [newsweek.com](http://newsweek.com) , it's good 
     enough to be version 1.0.

 * Fixed bug in pause/resume logic when using asyncAll that was preventing 
    execution from resuming.

 * Fixed error in IE when using `proxyGetElementById`.

## 0.9.5 ##

 * Big overhaul of the internal queuing system. It should be more robust and 
   100% deterministic from this point forward. Known to help with deeply nested
   cross domain scripts.

 * Fixed issue where scripts that include newlines in their src attribute were
   being truncated.
   
 * Added debugging support. See support/debug-support.js.

## 0.9.0 ##

 * writeCapture.js has matured enough to be close to a 1.0 release, after a
   little seasoning. If you have a problem with your Ad server or other code,
   submit a bug report!

 * Added hacks to support scripts that combine `document.write` with DOM 
   manipulation and iframes. Thanks to [jcugno](http://github.com/jcugno)
   for the bug reports and example code. Enabling `proxyGetElementById` 
   should help with some Ad servers.

## 0.3.3 ##

 * Fixed a number of issues with 'marginal' scripts (but if all scripts were in
   good shape, you wouldn't need writeCapture). Should help with some ad servers.
   Hat tip to [neskire](http://github.com/neskire) for raising the issues.

## 0.3.2 ##

 * Bugfix - jQuery 1.4.1 has a bug in replaceWith that mishandles strings. We 
   work around it by not using replaceWith.

## 0.3.1 ##
 
  * Added fixUrls hack to deal with encoded URLs.
 
  * Added MIT and GPL licenses, applied retroactively to all versions.

  * Optimized script loading (start loading in parallel immediately) if asyncAll is enabled.

## 0.3.0 ##
  
   * Replaced `sanitizeAll` with `sanitizeSerial`.

   * Created jQuery plugin.

   * Run all sanitized scripts through a global queue to prevent problems when
   multiple sanitizes with async loads are run in sequence.

## 0.2.1 ##
   
   * Added `html` and `replaceWith` convenience methods.

   * Added `load` convenience method.
 
## 0.2.0 ##
   
   * Only tasks that were running async (read: async script 
   loading with pause/resume) will result in a call to defer.
   
   * Allowed replacement of support functions by defining writeCaptureSupport
   so writeCapture can be used without jQuery.

   * Added nolib-support.js for using writeCapture without jQuery.

## 0.1 ##

   * first release. Any content but a single script tag would result in 
   partially async execution thanks to an overuse of defer.

[jesus]: http://iamnoah.blogspot.com/2009/12/github-taming-documentwrite-and-nodejs.html?showComment=1275069903219#c7207630670857732321 "It will save your site from hacks."