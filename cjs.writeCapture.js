(function(global,wc) {
	function wcEvil(code) {
		wc.replaceWith(global.CJS.curScript,'<script>'+code+'</script>');
	}
	
	function wcExt(src,cb) {
		// copied from control.js. be sure we support callbacks properly
		var fonload = ( function(ponload) {
			switch ( typeof(ponload) ) { 
				case "string": 
				  ponload = new Function(ponload);
				  break;	 
				case "function": 
				  // ponload is already a function
				  break; 
				default: 
				  ponload = new Function();
			}
			return ponload;
		})(cb);		
		wc.replaceWith(global.CJS.curScript,'<script src="'+src+'"> </script>',fonload);
	}
	
	global.__writeCapture_cjsSupport_setup = function() {
		// 2. replace CJS's eval and exec with our eval and exec
		global.CJS.eval =  wcEvil;		
		global.CJS.execScript = wcExt;		
	};
	
	// 1. add an inline CJS script to the top that calls setup
	// this should be the first script CJS evals
	var dummy = document.createElement('script');
	var sib = document.getElementsByTagName('script')[0];
	sib.parentNode.insertBefore(dummy, sib);
	wc.replaceWith(dummy,'<script type="text/cjs">__writeCapture_cjsSupport_setup();</script>');
	
	if(global.writeCapture_cjsSrc) {
		var se = document.createElement('script');
		se.src = global.writeCapture_cjsSrc;
		sib.parentNode.insertBefore(se, sib);
	}
})(this,this.writeCapture);