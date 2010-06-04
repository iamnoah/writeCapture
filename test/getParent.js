document.write('<div id="abc123">Foo');
document.write('<p id="456def">Hello World</p>');
document.getElementById('456def').parentNode.className = 'parent1';
document.getElementById('abc123').parentNode.className = 'parent2';
document.write('Bar</div>')