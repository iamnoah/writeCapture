(function($,dwa) {
	document.write = document.writeln = function(s) {
		ok(false,"'real' document.write(ln) called!");
		if(window.console) {
			console.warn("wrote: ",s);
		}
	};
	var fn = dwa._forTest;
	// enable for all tests to catch side effects
	dwa.proxyGetElementById = true;
	
	function notest() {}
	
	module("support");
	test("slice",function() {
		same(fn.slice([1,2,3],1),[2,3]);
		same(fn.slice([1,2,3]),[1,2,3]);
		same(fn.slice([1,2,3,4,5,6],2,4),[3,4]);
		same((function() { return fn.slice(arguments,1); })(1,2,3,4,5),[2,3,4,5]);
	});
	test("captureWrite",function() {
		equals(fn.captureWrite("document.write('FooBarBaz')",{}).out,'FooBarBaz');
	});
	
	module("support.Q");
	test("push",function() {
		var q = new fn.Q(), foo = 0;
		q.push(function () { foo++; });
		equals(foo,1);
	});
	test("pause/resume",function() {
		var q = new fn.Q(), foo = 0;
		q.push(FOO);
		equals(foo,1);
		
		q.pause();
		q.push(FOO);
		equals(foo,1);
		
		q.resume();
		equals(foo,2);
		
		q.push(FOO);
		equals(foo,3);
		
		function FOO() { foo++; }
	});
	test("pause/resume/defer",function() {
		var i = 5, q = new fn.Q(), f = i;
		stop();
		while(--i) {
			(function() {
				var foo = i;
				q.push(function() {
					if(Math.floor(Math.random() * 2)) {
						FOO(foo);
					} else {
						q.pause();
						setTimeout(function() {
							FOO(foo);
							q.resume();
						},Math.floor(Math.random() * 100)+1);
					}
				});
			})();
		}
		q.push(function() {
			FOO(0);
			start();
		});
		function FOO(expected) { equals(--f,expected); }
	});
	test("parent/child pause-resume",function() {
		var root = new fn.Q(), foo = 0;
		expect(13);
		
		root.push(function() { // san(<span...foo) {
			var fooQ = new fn.Q(root);
			FOO(10);
			fooQ.push(function() { // push(foo.js) 
				var q = new fn.Q(fooQ); // san(Foo)
				FOO(20);
			});
			fooQ.push(function() { // push(pb.js) {
				fooQ.pause();
				setTimeout(function() { // ajax
					var q = new fn.Q(fooQ); // san(external Bar)
					q.push(function() {
						FOO(30);
						q.pause();
						setTimeout(function() {
							FOO(40);
							q.resume();
						},10);
					});
					q.push(function() {
						FOO(45);
					});
					fooQ.resume();
				},10);
			});
			fooQ.push(function() { // push(inline)
				var q = new fn.Q(fooQ); // san(Baz)
				FOO(50);
			});
		});
		root.push(function() { // san(<span..bar)			
			FOO(60);
		});
		root.push(function() { // san(<span...baz)			
			var bazQ = new fn.Q(root);
			FOO(70);
			bazQ.push(function() { // push(inline)
				var sQ = new fn.Q(bazQ); // san(<script...bar.js)
				FOO(80);
				sQ.push(function() { // push(bar.js)
					var barJsQ = new fn.Q(sQ); // san(bAr<pb.js>bAr)
					FOO(90);
					barJsQ.push(function() { // push(pb.js)
						FOO(100);
						barJsQ.pause();
						setTimeout(function() {
							var q = new fn.Q(barJsQ); // san(external bar)
							FOO(110); 
							barJsQ.resume();
						},10);
					});
				});
			}); 
		});
		root.push(function() {
			FOO(120);
			start();
		});
		
		stop();
		function FOO(expected) { 
			ok(foo < expected,expected);
			foo = expected;
		}
	});
	
	function h(html) {
	    return html.replace(/</g,'&lt;').toLowerCase().replace(/[\s\r\n]+/g,' ');
	}

	
	module("parse");
	test("matchAttr",function() {
		var src = fn.matchAttr('src');
		equals(src('<script src=http://foo.com/bar?baz=qux>'),'http://foo.com/bar?baz=qux');
		equals(src('<script src=baz qux>'),'baz');
		equals(src('<script language="JavaScript1.1" src="http://adfarm.mediaplex.com/ad/js/9609-84269-1178-\n4?mpt=20100510143412&mpvc=http://media.fastclick.net/w/click.here?cid=142556;mid=418766;sid=52463;m=1;c=0;forced_click=">\n</script>'),'http://adfarm.mediaplex.com/ad/js/9609-84269-1178-\n4?mpt=20100510143412&mpvc=http://media.fastclick.net/w/click.here?cid=142556;mid=418766;sid=52463;m=1;c=0;forced_click=');
		equals(fn.matchAttr('type')('<script type="text/javascript">'),'text/javascript');
	});
	
	module("sanitize");
	// safari 3.2.1 loads and executes xdomain scripts synchronously
	var safari321 = false & $.browser.safari && $.browser.version === "525.27.1";
	function testSanitize(html,expected,sync,options,safariBug,testHtml) {
		expect(sync === null ? 2 : 3);
		if(!sync) $.ajaxSettings.cache = true;
		var done = false;
		if(!sync) stop();
		if(options) options.done = finish;
		$('#foo').html('<div/>').find('div').replaceWith(dwa.sanitize( html, options || finish ));
		function finish(){ 
			done = true; 
			ok(done,"done called"); 
			equals(h($('#foo')[testHtml ? 'html' : 'text']()),h(expected));
			if(!sync) start(); 
		}
		if(sync !== null) {
			equals(done,!!sync || !!safariBug,"scripts sync");			
		}
	}
	
	test("inline",function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar");</script>Baz',
			"FooBarBaz",true);
	});
	
	test("document.getElementById",function() { // issue #5
		testSanitize(
			'Foo<script type="text/javascript" src="getById.js"> </script>Baz',
			'FooHello WorldBaz',true);
	});

	test("parentNode",function() { // issue #8
		dwa.writeOnGetElementById = true;
		testSanitize(
			'<script type="text/javascript" src="getParent.js"> </script>',
			'FooHello WorldBar',true);
		expect(6); // testSanitize runs 3
		ok($('#abc123').hasClass('parent1'));
		ok($('#foo').hasClass('parent2'));
		$('#abc123').removeAttr('class')
		dwa.writeOnGetElementById = false;
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
			$('<div/>').append('Foo<span>Bar<input name="Bar"/></span>Baz').html(),true,null,false,true);
	});
	

	test("external", function() {
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script>BarBaz',
			"FooBarBaz",true);
	});
	test("external async", function() {
		// null for sync means we don't care. since it's local, this script might load before we can pause the queue
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script>BarBaz',
			"FooBarBaz",null,{asyncAll: true});
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
	
	test("all asyncAll", function() {
		testSanitize(
				'<script type="text/javascript" src="foo.js"> </script><script type="text/javascript" src="http://noahsloan.com/bar.js"> </script><script type="text/javascript">document.write("Baz");</script>',
		"Fooexternal barBaz",false,{asyncAll: true});
	});
	
	test("nested", function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz',
			"FooBarbArexternal barbArBarBaz",false,null,safari321);
	});
	
	test("nested - no xdomain", function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"baz.js\\"> </scr"+"ipt>Bar");</script>Baz',
			"FooBarbArFoobArBarBaz",true);
	});
	
	test("nested asyncAll", function() {
		testSanitize(
				'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz',
		"FooBarbArexternal barbArBarBaz",false,{asyncAll: true},safari321);
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
		$('#foo').html(dwa.sanitize('Foo<script type="text/javascript" src="http://noahsloan.com/wc2x/foo.js"></script>Baz',function() {
			equals($('#foo').text(),'FooBarBaz');
			equals(order++,1,"order");
		}));
		$('#bar').html(dwa.sanitize('Qux<script type="text/javascript" src="http://noahsloan.com/wc2x/bar.js"></script>Quxxx',function() {
			equals($('#bar').text(),'QuxQuxxQuxxx');
			equals(order++,2,"order");
		}));
		$('#baz').html(dwa.sanitize('<script type="text/javascript" src="http://noahsloan.com/wc2x/baz.js"></script>',function() {
			equals($('#baz').text(),'Baz');
			equals(order++,3,"order");
			start();
		}));
	});
	
	module("helpers");
	test("html",function() {
		expect(1);
		stop();		
		$.ajaxSettings.cache = true;
		dwa.html('#foo',
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz',
			function() {
				equals($('#foo').text(),'FooBarbArexternal barbArBarBaz');
				start();
			});
	});
	test("replaceWith",function() {
		expect(1);
		$.ajaxSettings.cache = true;
		stop();		
		dwa.replaceWith('#qux',
			'<div id="quxx">Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz</div>',
			function() {
				equals($('#quxx').text(),'FooBarbArexternal barbArBarBaz');
				start();
			});
	});
	
	test("load",function() {
		expect(1);
		$.ajaxSettings.cache = true;
		stop();		
		dwa.load('#quxx','testLoad.html',function() {
			equals($('#quxxx').text(),'FooBarbArexternal barbArBarBaz');
			start();
		});
	});	
	
	module("sanitizeAll");
	test("fragments",function() {
		expect(3);
		stop();
		$.ajaxSettings.cache = true;
		function fn(el) {
			return function(content) {
				$(el).replaceWith(content);
			};
		}
		dwa.sanitizeSerial([{
			action: fn('#foo'),
			html: '<span class="foo"><script type="text/javascript" src="foo.js"> </script><script type="text/javascript" src="http://noahsloan.com/bar.js"> </script><script type="text/javascript">document.write("Baz");</script></span>'
		}]);
		dwa.sanitizeSerial([{
			action: fn('#bar'),
			html: '<span class="bar">FooBarBaz</span>'
		},{
			action: fn('#baz'),
			html: '<span class="baz">Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz</span>'
		}],done);
		function done() {
			equals($('.foo').text(),"Fooexternal barBaz");
			equals($('.bar').text(),"FooBarBaz");
			equals($('.baz').text(),"FooBarbArexternal barbArBarBaz");
			start();
		}
	});
})(jQuery,writeCapture);