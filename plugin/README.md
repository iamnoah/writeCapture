# jquery.writeCapture.js #

The writeCapture.js jQuery plugin provides an easy way to utilize 
[writeCapture.js](http://github.com/iamnoah/writeCapture) the jQuery way. e.g.,

    $('#foo').writeCapture().load('someUrl.php',function() {
		alert("loaded safely!");
	}).html('Safe! - Loading').endCapture().html('Unsafe!');

