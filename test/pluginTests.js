(function($) {
	// TODO need a lot more tests... could test all methods in a loop by matching script markup to result
	
	module("html");
	test("inline",function() {
		$('#foo').writeCapture('html','Foo<script type="text/javascript">document.write("Bar");</script>');
		equals($('#foo').html(),'FooBar');
	});
	
	module("replaceWith");
	test("inline",function() {
		$('#foo').writeCapture('replaceWith','<div id="foo">Foo<script type="text/javascript">document.write("BaZ");</script></div>');
		equals($('#foo').html(),'FooBaZ');		
	});
				
	module("options");
	test("writeOnGetElementById",function() {
		expect(1);
		$.writeCapture.writeOnGetElementById = false;
		$.writeCapture.proxyGetElementById = false;
		$('#foo').writeCapture().replaceWith('<script src="http://noah/code/writeCapture/test/getOpts.js"></script>',{
			writeOnGetElementById: true,
			done: function() {
				start();
				equals($('#foo').html(),'FooBaZ');
			}
		});
		stop();
	});	
	
	module("proxying");
	test('find',function(){
		$('#qux').html('<div class="quxx"></div>Qux');
		equals($('#qux').writeCapture().find('.quxx').
			html('Foo<script type="text/javascript">document.write("BaZ");</script>').
			html(),'FooBaZ');
		equals($('#qux').html(),$('<div/>').html('<div class="quxx">FooBaZ</div>Qux').html());
	});
	test('end',function(){
		$('#qux').html('<div class="quxx"></div>Qux');
		equals($('#qux').writeCapture().find('.quxx').
			html('Foo<script type="text/javascript">document.write("BaZ");</script>').
			end().html(),$('<div/>').html('<div class="quxx">FooBaZ</div>Qux').html());
	});
	test('endCapture',function(){
		$('#qux').html('<div class="quxx"></div>Qux');
		equals($('#qux').writeCapture().find('.quxx').
			html('Foo<script type="text/javascript">document.write("BaZ");</script>').
			end().endCapture().html(),$('<div/>').html('<div class="quxx">FooBaZ</div>Qux').html());
	});	

	module("issues");
	test("4",function() {
		document.write = function(it) { console.log('MISS',it); };
		$('#qux').writeCapture('html','<script type="text/javascript" src="bs-serving.js"> </script>');
	});
	
	module("load");
	test("inline",function() {
		expect(4);
		stop();
		$('#bar, #baz').writeCapture('load','testLoadInline.html',function() {
			var loaded = $('.loadTest');
			equals(loaded.length,2);
			equals($(loaded[0]).text(),'FooBar1Baz');
			equals($(loaded[1]).text(),'FooBar2Baz');
			equals(window.foobarbaz,2);
			delete window.foobarbaz;
			start();
		});
	});
	
	test("selector",function() {
		expect(2);
		stop();
		$('.loadTest').writeCapture('load','testLoadFilter.html .loadTest',function() {
			var loaded = $('.loadTest');
			equals(loaded.length,2);
			equals($(loaded).text(),'FooBarBazFooBarBaz');
			start();
		});
	});	
	
})(jQuery);