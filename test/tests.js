(function(jQuery,dwa) {
	var fn = dwa._forTest;
	
	module("support");
	test("slice",function() {
		same(fn.slice([1,2,3],1),[2,3]);
		same(fn.slice([1,2,3]),[1,2,3]);
		same(fn.slice([1,2,3,4,5,6],2,4),[3,4]);
		same((function() { return fn.slice(arguments,1); })(1,2,3,4,5),[2,3,4,5]);
	});
	test("captureWrite",function() {
		equals(fn.captureWrite("document.write('FooBarBaz')"),'FooBarBaz');
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
	
	module("sanitize");
	function testSanitize(html,expected,sync,options) {
		expect(3);
		if(!sync) $.ajaxSettings.cache = true;
		var done = false;
		if(!sync) stop();
		if(options) options.done = finish;
		$('#foo').html(dwa.sanitize( html, options || finish ));
		function finish(){ 
			done = true; 
			ok(done,"done called"); 
			equals($('#foo').text(),expected);
			if(!sync) start(); 
		}
		equals(done,!!sync,"scripts sync");			
	}
	test("inline",function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar");</script>Baz',
			"FooBarBaz",true);
	});
	

	test("external", function() {
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script>BarBaz',
			"FooBarBaz",true);
	});
	test("external async", function() {
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script>BarBaz',
			"FooBarBaz",false,{asyncAll: true});
	});

	test("xdomain", function() {
		testSanitize('Foo<script type="text/javascript" src="http://pastebin.com/pastebin.php?dl=f70a35f26"> </script>Baz',
			"Fooexternal barBaz");
	});

	test("all", function() {
		testSanitize(
			'<script type="text/javascript" src="foo.js"> </script><script type="text/javascript" src="http://pastebin.com/pastebin.php?dl=f70a35f26"> </script><script type="text/javascript">document.write("Baz");</script>',
			"Fooexternal barBaz");
	});
	
	test("all asyncAll", function() {
		testSanitize(
				'<script type="text/javascript" src="foo.js"> </script><script type="text/javascript" src="http://pastebin.com/pastebin.php?dl=f70a35f26"> </script><script type="text/javascript">document.write("Baz");</script>',
		"Fooexternal barBaz",false,{asyncAll: true});
	});
	
	test("nested", function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz',
			"FooBarbArexternal barbArBarBaz");
	});
	
	test("nested - no xdomain", function() {
		testSanitize(
			'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"baz.js\\"> </scr"+"ipt>Bar");</script>Baz',
			"FooBarbArFoobArBarBaz",true);
	});
	
	test("nested asyncAll", function() {
		testSanitize(
				'Foo<script type="text/javascript">document.write("Bar<scrip"+"t type=\\"text/javascript\\" src=\\"bar.js\\"> </scr"+"ipt>Bar");</script>Baz',
		"FooBarbArexternal barbArBarBaz",false,{asyncAll: true});
	});
	
	module("sanitizeAll");
	test("fragments",function() {
		expect(3);
		stop();
		$.ajaxSettings.cache = true;
		dwa.sanitizeAll([{
			selector: '#foo',
			html: '<span class="foo"><script type="text/javascript" src="foo.js"> </script><script type="text/javascript" src="http://pastebin.com/pastebin.php?dl=f70a35f26"> </script><script type="text/javascript">document.write("Baz");</script></span>'
		},{
			selector: '#bar',
			html: '<span class="bar">FooBarBaz</span>'
		},{
			selector: '#baz',
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