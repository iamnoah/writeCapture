var divid='testDiv';
document.write('<div id=' + divid + '>');
var span = document.createElement('span');
span.innerHTML = 'Hello World';
document.getElementById(divid).appendChild(span);
