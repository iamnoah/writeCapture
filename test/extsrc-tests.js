function h(html) {
    return html.replace(/</g,'&lt;').toLowerCase().replace(/[\s\r\n]+/g,' ');
}

test("bar",function() {
	expect(2);
	stop();
	writeCapture.extsrc(function() {
		ok(true,"callback called");
		equals(h('barexternal barbar'),h($('#foo').html()));
		start();
	});
});