(function($,dwa) {
	document.write = document.writeln = function(s) {
		ok(false,"'real' document.write(ln) called!");
		if(window.console) {
			console.warn("wrote: ",s);
		}
	};
	function h(html) {
	    return $('<div/>').html(html).html().replace(/</g,'&lt;').toLowerCase().replace(/[\s\r\n]+/g,' ');
	}
	(window.writeCaptureSupport ? writeCaptureSupport : dwa._forTest.$).onLoad = function(fn) {
		setTimeout(fn,1);
	};
	var fn = dwa._forTest;
	
	function reset() {		
		$('#test-content').html($('#fakeHolder').html(''));
	}
	module('autoCapture');
	test('simple',function() {
		expect(1);
		dwa.autoAsync(function() {
			equals(h('FooBarBaz\nQuxQuxxQuxx'),h($('#auto-test').html()));
			reset(); start();
		});
		
		document.writeln('<div id="auto-test">FooBarBaz');
		document.write('QuxQuxxQuxx</div>');
		
		stop();
	});
	test('multiple',function() {
		expect(2);
		dwa.autoAsync(function() {
			equals(h('FooBarBaz\nQuxQuxxQuxx'),h($('#auto-test').html()));
			equals(h('Easy as ABC\n123 Do Re Mi'),h($('#auto-test2').html()));
			reset(); start();
		});
		
		document.writeln('<div id="auto-test">FooBarBaz');
		document.write('QuxQuxxQuxx</div>');
		
		$('#test-content').append('<div id="fakeScript"></div>');

		document.writeln('<div id="auto-test2">Easy as ABC');
		document.write('123 Do Re Mi</div>');
		
		stop();		
	});	
	test('inline',function() {
		expect(1);
		dwa.autoAsync(function() {
			equals(h('FooBarBaz'),h($('#auto-test').html()));
			reset(); start();
		});
		
		document.write('<div id="auto-test">Foo<script type="text/javascript">document.write("Bar");</script>Baz</div>');
		stop();		
	});		
	test('external',function() {
		expect(1);
		dwa.autoAsync(function() {
			equals(h('FooBarBaz'),h($('#auto-test').html()));
			reset(); start();
		});
		
		document.write('<div id="auto-test"><script type="text/javascript" src="foo.js"> </script>BarBaz</div>');
		stop();		
	});		
	test('xdomain',function() {
		expect(1);
		dwa.autoAsync(function() {
			equals(h($('#auto-test').html()),h('Fooexternal barBaz'));
			reset(); start();
		});
		
		document.write('<div id="auto-test">Foo<script type="text/javascript" src="http://noahsloan.com/bar.js"> </script>Baz</div>');
		stop();								
	});		
	test('nested',function() {
		expect(1);
		dwa.autoAsync(function() {
			equals(h($('#auto-test').html()),h('FooBarbArexternal barbArBarBaz'));
			reset(); start();
		});
		
		document.write('<div id="auto-test">Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz</div>');
		stop();		
	});		
})(jQuery,writeCapture);