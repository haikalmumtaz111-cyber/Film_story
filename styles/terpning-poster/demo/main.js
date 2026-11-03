const q = new URLSearchParams(location.search);
const mod = await import(q.get('test') ? './test.js' : './film.js');
const draw = await mod.setup(document.getElementById('c'), q);
window.render = t => draw(t);
render(Number(q.get('t0') || 0)); window.READY = true;
