# Usage Summary #

## Simple

writeCapture2 offers a simple API:

    writeCapture.write(document.getElementById('foo'),'<script>...');
    writeCapture.write(document.getElementById('bar'),'<script src="anotherScript.js">...');
    writeCapture.write(document.getElementById('foo'),'<p>etc.</p>');
    writeCapture.write(function() {
    	alert('all document.writes are done!');
    });

`writeCapture.write` will ensure everything is run in order. Passing a function will call that functions when all the previous writes have finished and before any writes that follow it.

## Advanced

The advanced API has the same semantics as document.write, but targets an element instead of a document or iframe:

    writeCapture(element,doneCallback).write('some html with document.write scripts').close();

Remember to call close.

Note that it accepts a single, unwrapped DOM element. If you have a jQuery object, you'll need to unwrap it before passing it to writeCapture.

The advanced API will happily let you run multiple scripts at a time which can cause problens. Unless you need to write partial HTML fragments, you should always use the simple API.

# Dependencies #

writeCapture2 depends only on the [element.write](https://github.com/iamnoah/element.write) library.

# Help!

Always ask your question on the [mailing list](http://groups.google.com/group/writecapturejs-users). Please ask your question [the smart way](http://catb.org/~esr/faqs/smart-questions.html#before). That includes creating a stripped down and *working* example at http://jsfiddle.net/ or http://jsbin.com so that everyone can play with it. A private page on your site demonstrating the problem is rarely helpful because we can't go and edit the source. Please take the time to reproduce it on JS fiddle so we can help you.

Please **do not** email the author privately or open an issue in the issue tracker unless you have a test case showing you've found a real bug. The author does not actively use write capture, so he probably does not have any idea what is causing your problem.

You may think that it is quicker to go straight to the mailing list or the author without taking the time to isolate the problem and fully read and comprehend the documentation and  go over the source code, but anyone who can help you has already done all of those things. Please respect our time, and you will get enthusiastic help.
