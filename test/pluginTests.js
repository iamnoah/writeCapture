(function($) {
	
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