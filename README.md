# Why? #

Sometimes we are forced to use a third party script or markup that we simply 
cannot change. While our websites are sleek and snappy with a nearly pristine
codebase and progressive enhancement and Ajax every, many 3rd party libraries
are still using tables for layout and the dreaded, evil document.write method.

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

`writeCapture.sanitize` doesn't execute scripts, the scripts are executed by 
jQuery and the browser when the HTML returned by `sanitize` is inserted into
the page via `html()`, `replaceWith()` or any other jQuery HTML manipulation
method.

## Single element inline and same domain scripts ##

    var html1 = '<div>Some HTML with <script type="text/javascript">document.write("scripts");</script> in it.</div>';
    
    $('#someElement').html(writeCapture.sanitize(html1));
	// $('#someElement').html() === '<div>Some HTML with scripts in it.</div>'

## XDomain and multiple element scripts ##
 
    // http://example.com/xdomain.js = document.write('a script on another domain');
    
    var html2 = '<div>Some HTML with <script type="text/javascript" src="http://example.com/xdomain.js"> </script>.</div>';
    
    $('#someElement').html(writeCapture.sanitize(html2,function () {
		// $('#someElement').html() === '<div>Some HTML with a script on another domain.</div>'
	}));
    
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

# Caveats/Limitations #
 
* If any of the included scripts are on another domain, they will have to be 
  loaded asynchronously via script tag injection. Subsequent scripts will be 
  blocked, so order will be preserved, but this means that not all scripts may 
  have yet run after the HTML is injected. This means that if your script 
  depends on all the scripts in the HTML having run, it should utilize the 
  done() callback.
 
* Because of the asynchronous loading, attempting to sanitize a second HTML 
  fragment before the first is done can have undefined results. Use sanitizeAll
  if you have multiple HTML fragments to load.
  
* Scripts that assume that they are the last element in the document will 
  probably not function properly. This is rare, but if a script is uncouth 
  enough to use document.write, it's a possibility.
