# Why? #

Sometimes we are forced to use a third party script or markup that we simply 
cannot change. While our websites are sleek and snappy with a nearly pristine
codebase and progressive enhancement and Ajax everywhere, many 3rd party 
libraries are still using tables for layout and the dreaded, *evil* 
document.write method.

What makes document.write so evil is that it is only useful for scripts inside
the body tag that are processed while the page is loading. If document.write is
called anytime after page load, it wipes out all the existing page content. 
That makes it very difficult to dynamically refresh content containing 
document.write calls.

Fortunately for you, difficult is not impossible, and writeCapture.js has 
already written (and extensively tested) the difficult part for you. All 
you have to do is give it the offending evil HTML and it will return nice
clean HTML, safe for injection into the document. And it does it all in less
than 1.6k when Packed and Gzipped.

# Usage #

The easiest way to use writeCapture is through the 
[jQuery plugin](tree/master/plugin/). The remainder of this documentation will 
describe somewhat lower level use cases and go into the finer details of the 
library.

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

If any of the scripts being loaded is on another domain (or asyncAll: ), they will be 
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

When you have multiple HTML fragments, it can be important that they are run 
in order. Any time you have more than one sanitize operations to run, you 
should use `writeCapture.sanitizeSerial`. If will take care of linking the 
actions together so that each runs only after the previous sanitize 
operation has finished:

    /*
    	$('body).html() === 
    	'<div id="foo"> </div><div id="bar"> </div>'
    */
    
    wrapCapture.sanitizeSerial([{
    	html: html1, action: function(html) { $('#foo').replaceWith(html); }
    },{	
    	html: html2, function(html) { $('#bar').replaceWith(html); }
    }],function() {
    	/*
    		$('body).html() === 
    		'<div>Some HTML with scripts in it.</div><div>Some HTML with a script on another domain.</div>';
    	*/
    });

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
    	dataType: "script", // will be "script" or undefined
    	async: true/false,
    	success: callback(text), // called on sucess
    	error: callback(xhr,status,error) // called on error
    }

Implementations can assume that type is always GET, but the parameter will be 
passed regardless. If dataType === "script", then it is assumed that the 
script will be loaded and executed asynchronously via 
[script tag injection](http://jaybyjayfresh.com/2007/09/17/using-script-tags-to-do-remote-http-calls-in-javascript/).
dataType will only be set to "script" if the script being loaded is on another 
domain.

The success callback should be passed the text of the script (if 
dataType:"script", the text will not be used and can be omitted). The error
callback should be passed 3 parameters, the third being the Error that occured.
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

# Caveats/Limitations #
 
* If any of the included scripts are on another domain, they will have to be 
  loaded asynchronously via script tag injection. Subsequent scripts in the 
  HTML will be blocked, so order will be preserved, but this means that not 
  all scripts may have yet run after the HTML is injected. This means that if 
  your script depends on all the scripts in the HTML having run, it should 
  utilize the done() callback.
 
* Because of the asynchronous loading, attempting to sanitize a second HTML 
  fragment before the first is done can have undefined results. Use 
  `sanitizeSerial` if you have multiple HTML fragments to load.
  
* Scripts that assume that they are the last element in the document will 
  probably not function properly. This is rare, but if a script is uncouth 
  enough to use document.write, it's a possibility.

# Version History #

## 0.3.0 ##
  
   * Replaced `sanitizeAll` with `sanitizeSerial`.

   * Created jQuery plugin.

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