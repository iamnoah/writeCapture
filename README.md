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
than 1.5k when Packed and Gzipped.

# Usage #

In these example, note that `writeCapture.sanitize` doesn't execute scripts, 
the scripts are executed by jQuery and the browser when the HTML returned by 
`sanitize` is inserted into the page via `html()`, `replaceWith()` or any 
other jQuery HTML manipulation method.

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

    /*
    	$('body).html() === 
    	'<div id="foo"> </div><div id="bar"> </div>'
    */
    
    wrapCapture.sanitizeAll([{
    	html: html1, selector: '#foo'
    },{	
    	html: html2, selector: '#bar'	
    }],function() {
    	/*
    		$('body).html() === 
    		'<div>Some HTML with scripts in it.</div><div>Some HTML with a script on another domain.</div>';
    	*/
    });

# Dependencies #

* jQuery. Developed using 1.3.2, but should work with most versions. Send 
  feedback if you use a different version.

## Using without jQuery ##

Firstly, why aren't you using jQuery? Are you sure? Well if you're sure that 
you don't want to have to include jQuery, then it isn't too hard to replace
the support functions that writeCapture needs.

writeCapture needs 2 support functions. You provide them by defining a 
`writeCaptureSupport` object:

    window.writeCaptureSupport = {
    	ajax: function(options) { /*...*/ },
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

The sucess callback should be passed the text of the script (if 
dataType:"script", the text will not be used and can be omitted). The error
callback should be passed 3 parameters, the third being the Error that occured.
The first two parameters are ignored. Either success or error must eventually 
be called for each call to `ajax`.

### `replaceWith` ###

`replaceWith` is equivalent to jQuery's 
[replaceWith](http://docs.jquery.com/Manipulation/replaceWith#content).
The key feature is that the second parameter will always be an HTML string and
any script tags it contains must be executed.

# Caveats/Limitations #
 
* If any of the included scripts are on another domain, they will have to be 
  loaded asynchronously via script tag injection. Subsequent scripts in the 
  HTML will be blocked, so order will be preserved, but this means that not 
  all scripts may have yet run after the HTML is injected. This means that if 
  your script depends on all the scripts in the HTML having run, it should 
  utilize the done() callback.
 
* Because of the asynchronous loading, attempting to sanitize a second HTML 
  fragment before the first is done can have undefined results. Use sanitizeAll
  if you have multiple HTML fragments to load.
  
* Scripts that assume that they are the last element in the document will 
  probably not function properly. This is rare, but if a script is uncouth 
  enough to use document.write, it's a possibility.

# Version History #
 
 * 0.2.0-SNAPSHOT 
   
   * Only tasks that were running async (read: async script 
   loading with pause/resume) will result in a call to defer.
   
   * Allowed replacement of support functions by defining writeCaptureSupport
   so writeCapture can be used without jQuery.

 * 0.1 - first release. Any content but a single script tag would result in 
   partially async execution thanks to an overuse of defer.