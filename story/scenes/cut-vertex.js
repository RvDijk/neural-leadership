import { el, onceVisible } from '../lib.js';

function buildCutVertex() {
  const host = document.getElementById('cut-stage');
  if (!host) return;
  const svg = el('svg', {
    viewBox: '0 0 400 400', class: 'cut-svg', role: 'img',
    'aria-labelledby': 'cut-t cut-d',
  });
  el('title', { id: 'cut-t' }, svg).textContent = 'A cut-vertex network';
  el('desc',  { id: 'cut-d' }, svg).textContent = 'Two clusters joined only through a single central node; removing it disconnects them.';

  const left = [], right = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    left.push({ x: 110 + Math.cos(a) * 60, y: 200 + Math.sin(a) * 60 });
    right.push({ x: 290 + Math.cos(a) * 60, y: 200 + Math.sin(a) * 60 });
  }
  const vertex = { x: 200, y: 200 };

  const drawEdge = (a, b, isBridge = false) => {
    el('line', {
      class: 'cut-edge' + (isBridge ? ' bridge' : ''),
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    }, svg);
  };
  for (let i = 0; i < left.length; i++)
    for (let j = i + 1; j < left.length; j++)
      if ((i + j) % 2 === 0) drawEdge(left[i], left[j]);
  for (let i = 0; i < right.length; i++)
    for (let j = i + 1; j < right.length; j++)
      if ((i + j) % 2 === 0) drawEdge(right[i], right[j]);
  drawEdge(left[0], vertex, true);
  drawEdge(left[2], vertex, true);
  drawEdge(right[0], vertex, true);
  drawEdge(right[2], vertex, true);

  [...left, ...right].forEach(n => el('circle', { class: 'cut-node', cx: n.x, cy: n.y, r: 8 }, svg));
  el('circle', { class: 'cut-node vertex', cx: vertex.x, cy: vertex.y, r: 14 }, svg);

  host.appendChild(svg);

  onceVisible(svg, () => {
    setTimeout(() => {
      svg.querySelector('.vertex').classList.add('removed');
      svg.querySelectorAll('.bridge').forEach(b => b.classList.add('removed'));
    }, 1600);
  }, 0.45);
}

export default buildCutVertex;
