require({
    paths: {
      'element.write': '../lib/element.write/element.write'
	}
});
require(['jquery','../writeCapture2','qunit/qunit'],function($,wc) {
	// wc.elementWrite.debug.parse = true;
	// wc.elementWrite.debug.write = true;

	document.write = document.writeln = function(s) {
		ok(false,"'real' document.write(ln) called!");
		if(window.console) {
			console.warn("wrote: ",s);
		}
	};

	$.fn.write = function(html,cb) {
		return this.each(function() {
			wc(this,cb).write(html).close();
		});
	};

	module("sanitize");
	// safari 3.2.1 loads and executes xdomain scripts synchronously
	var safari321 = false & $.browser.safari && $.browser.version === "525.27.1";
	function testSanitize(html,expected,sync,onDone,safariBug,testHtml) {
		expect(2);
		var done = false;
		stop();
		$('#foo').empty().write(html,finish);
		function finish(){
			done = true;
			ok(done,"done called");
			$('#foo').find('script').remove();
			equals(h($('#foo')[testHtml ? 'html' : 'text']()),h(expected));
			if(typeof onDone === 'function') onDone();
			start();
		}
	}

	function h(html) {
	    return trim(html).replace(/</g,'&lt;').toLowerCase().replace(/[\s\r\n]+/g,' ');
	}

	function trim(s) {
		return s.replace(/^\s+/,'').replace(/\s+$/,'');
	}

	test("inline",function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar");</script>Baz',
			"FooBarBaz",true);
	});

	test("document.getElementById",function() { // issue #5
		testSanitize(
			'Foo<script type="text/javascript" src="getById.js"> </script>Baz',
			'FooHello WorldBaz',false);
	});

	test("parentNode",function() { // issue #8
		testSanitize(
			'<script type="text/javascript" src="getParent.js"> </script>',
			'FooHello WorldBar',false,function() {
				ok($('#abc123').hasClass('parent1'));
				ok($('#foo').hasClass('parent2'));
				$('#abc123').removeAttr('class');
			});
		expect(4); // testSanitize runs 2
	});

	test("var to global",function() {
    	testSanitize( '<script>var hello = "Hello World";</script><script>document.write("Foo");document.write(hello);document.write("Bar");</script>', 'FooHello WorldBar', true);
	});

	test("xdomain getElementById",function() { // issue #5
		testSanitize(
			'Foo<script type="text/javascript" src="http://noahsloan.com/getById.js"> </script>Baz',
			'FooHello WorldBaz',false);
	});

	test("writeln",function() {
		testSanitize(
			'Foo<script type="text/javascript">document.writeln("Bar");</script>Baz',
			$("<div>FooBar\nBaz</div>").text(),true);
	});

	test("xhtml",function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write(\'<span>Bar<input name="Bar"></span>\');</script>Baz',
			$('<div/>').html('Foo<span>Bar<input name="Bar"/></span>Baz').html(),true,null,false,true);
	});


	test("external", function() {
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script>BarBaz',
			"FooBarBaz",false);
	});

	test("xdomain", function() {
		testSanitize('Foo<script type="text/javascript" src="http://noahsloan.com/bar.js"> </script>Baz',
			"Fooexternal barBaz");
	});


	test("xdomain - encoded ampersand", function() {
		testSanitize('Foo<script type="text/javascript"><!--\ndocument.write(\'<scri\'+\'pt type="text/javascript" src="http://noahsloan.com/writeCapture?blah&amp;foo=bar"> </s\'+\'cript>\');</script>Baz',
			"Fooexternal barBaz");
	});

	test("all", function() {
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script><script type="text/javascript" src="http://noahsloan.com/bar.js"> </script><script type="text/javascript">document.write("Baz");</script>',
			"Fooexternal barBaz",false,null,safari321);
	});

	test("nested", function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz',
			"FooBarbArexternal barbArBarBaz",false,null,safari321);
	});

	test("nested - no xdomain", function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"baz.js\\"> </scr"+"ipt>Bar");</script>Baz',
			"FooBarbArFoobArBarBaz",false);
	});

	test("deeply nested",function() {
		testSanitize(
			'<script src="http://noahsloan.com/test/a.js"> </script>',
			"Boo!Booooooring!",false);
	});

	test("2x xdomain sanitize",function() {
		expect(6);
		var order = 1;
		stop();
		$('#foo').empty();
		$('#foo').write('Foo<script type="text/javascript" src="http://noahsloan.com/wc2x/foo.js"></script>Baz',function() {
			$('#foo').find('script').remove();
			equals(trim($('#foo').text()),'FooBarBaz');
			equals(order++,1,"order");
			$('#bar').write('Qux<script type="text/javascript" src="http://noahsloan.com/wc2x/bar.js"></script>Quxxx',function() {
				$('#bar').find('script').remove();
				equals(trim($('#bar').text()),'QuxQuxxQuxxx');
				equals(order++,2,"order");
				$('#baz').write('<script type="text/javascript" src="http://noahsloan.com/wc2x/baz.js"></script>',function() {
					$('#baz').find('script').remove();
					equals(trim($('#baz').text()),'Baz');
					equals(order++,3,"order");
					start();
				});
			});
		});
	});

	test('incomplete HTML inside a written script',function() {
		// TODO what if the writer needs text from a subwriter? is that possible?
	});
});
