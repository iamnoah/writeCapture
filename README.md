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
  feedback if you use a different version. Future releases may allow for 
  pluggable support functions so you don't need jQuery.

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
 
 * 0.2.0-SNAPSHOT - Only tasks that were running async (read: async script 
   loading with pause/resume) will result in a call to defer.

 * 0.1 - first release. Any content but a single script tag would result in 
   partially async execution thanks to an overuse of defer.