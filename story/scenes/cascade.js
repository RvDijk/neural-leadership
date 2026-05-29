import { el, rng, onceVisible } from '../lib.js';

function buildCascade() {
  const host = document.getElementById('cascade-stage');
  if (!host) return;
  const svg = el('svg', {
    viewBox: '0 0 400 400', class: 'cascade-svg', role: 'img',
    'aria-labelledby': 'cascade-t cascade-d',
  });
  el('title', { id: 'cascade-t' }, svg).textContent = 'Signal cascade through a network';
  el('desc',  { id: 'cascade-d' }, svg).textContent = 'A central node fires; the signal propagates outward ring by ring, then a feedback arrow shows the signal returning attenuated to a peer of the origin.';

  const rand = rng(7);
  const nodes = [{ id: 0, x: 200, y: 200, ring: 0 }];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    nodes.push({ id: nodes.length, x: 200 + Math.cos(a) * 70, y: 200 + Math.sin(a) * 70, ring: 1 });
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + .2;
    nodes.push({ id: nodes.length, x: 200 + Math.cos(a) * 140, y: 200 + Math.sin(a) * 140, ring: 2 });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    nodes.push({ id: nodes.length, x: 200 + Math.cos(a) * 195, y: 200 + Math.sin(a) * 195, ring: 3 });
  }

  const adj = new Map();
  const addEdge = (a, b, line) => {
    if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ to: b, edge: line }); adj.get(b).push({ to: a, edge: line });
  };
  for (const n of nodes) {
    if (n.ring === 0) continue;
    const candidates = nodes.filter(m => m.ring === n.ring - 1).sort((a, b) =>
      Math.hypot(a.x - n.x, a.y - n.y) - Math.hypot(b.x - n.x, b.y - n.y));
    const a = candidates[0];
    const line = el('line', { class: 'c-edge', x1: a.x, y1: a.y, x2: n.x, y2: n.y }, svg);
    addEdge(a.id, n.id, line);
    if (rand() < .35 && candidates[1]) {
      const a2 = candidates[1];
      const line2 = el('line', { class: 'c-edge', x1: a2.x, y1: a2.y, x2: n.x, y2: n.y }, svg);
      addEdge(a2.id, n.id, line2);
    }
  }
  const nodeEls = nodes.map(n =>
    el('circle', {
      class: 'c-node' + (n.ring === 0 ? ' origin' : ''),
      cx: n.x, cy: n.y, r: n.ring === 0 ? 10 : 6,
    }, svg)
  );
  host.appendChild(svg);

  onceVisible(svg, () => {
    const depth = new Map([[0, 0]]);
    const queue = [0];
    while (queue.length) {
      const cur = queue.shift();
      for (const { to, edge } of adj.get(cur) || []) {
        if (depth.has(to)) continue;
        depth.set(to, depth.get(cur) + 1);
        queue.push(to);
        const d = depth.get(to);
        setTimeout(() => {
          edge.classList.add('fired');
          nodeEls[to].classList.add('fired');
          nodeEls[to].animate(
            [
              { r: nodeEls[to].getAttribute('r') },
              { r: 11, offset: .15 },
              { r: 8,  offset: .35 },
              { r: nodeEls[to].getAttribute('r') },
            ],
            { duration: 1400, easing: 'cubic-bezier(.85,0,.15,1)' }
          );
        }, 400 + d * 550);
      }
    }
    setTimeout(() => drawFeedbackLoop(svg, nodeEls), 400 + 4 * 550);
  });
}

function drawFeedbackLoop(svg, nodeEls) {
  if (nodeEls.length < 20) return;
  const far = nodeEls[18], near = nodeEls[3];
  const x1 = +far.getAttribute('cx'),  y1 = +far.getAttribute('cy');
  const x2 = +near.getAttribute('cx'), y2 = +near.getAttribute('cy');
  const cx = (x1 + x2) / 2 + (y1 - y2) * .8;
  const cy = (y1 + y2) / 2 + (x2 - x1) * .8;
  const defs = el('defs', {}, svg);
  const marker = el('marker', {
    id: 'feedback-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5,
    markerWidth: 6, markerHeight: 6, orient: 'auto',
  }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#ff9a6d' }, marker);
  const path = el('path', {
    d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    fill: 'none', stroke: '#ff9a6d', 'stroke-width': 1.5,
    'stroke-dasharray': '4 4', opacity: 0,
    'marker-end': 'url(#feedback-arrow)',
  }, svg);
  path.animate(
    [{ opacity: 0 }, { opacity: .85 }],
    { duration: 900, fill: 'forwards', easing: 'cubic-bezier(.4,0,.9,.5)' }
  );
}

export default buildCascade;
