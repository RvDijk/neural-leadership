import { el, clamp, rng } from '../lib.js';

function buildMirror() {
  const host = document.getElementById('mirror-stage');
  if (!host) return;
  const svg = el('svg', {
    viewBox: '0 0 400 400', class: 'mirror-svg', role: 'img',
    'aria-labelledby': 'mirror-t mirror-d',
  });
  el('title', { id: 'mirror-t' }, svg).textContent = 'Interactive network mirror';
  el('desc',  { id: 'mirror-d' }, svg).textContent = 'A network with one node highlighted as you. Activating the highlighted node fires a signal that propagates outward with decay; scarred edges attenuate the signal more strongly.';

  const rand = rng(42);
  const N = 18;
  const nodes = [{ x: 200, y: 200, you: true }];
  for (let i = 1; i < N; i++) {
    const a = (i / (N - 1)) * Math.PI * 2 + rand() * .4;
    const r = 90 + rand() * 80;
    nodes.push({ x: 200 + Math.cos(a) * r, y: 200 + Math.sin(a) * r, you: false });
  }
  const edges = [];
  for (let i = 1; i <= 7; i++) edges.push({ a: 0, b: i, w: .6 + rand() * .4, scarred: rand() < .25 });
  for (let i = 1; i < N; i++) {
    const partner = 1 + Math.floor(rand() * (N - 1));
    if (partner !== i) edges.push({ a: i, b: partner, w: .3 + rand() * .4, scarred: false });
  }
  edges.forEach((e, idx) => {
    const a = nodes[e.a], b = nodes[e.b];
    el('line', {
      class: 'm-edge' + (e.scarred ? ' scarred' : ''),
      x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'data-idx': idx,
    }, svg);
  });
  nodes.forEach((n, i) => {
    const c = el('circle', {
      class: 'm-node' + (n.you ? ' you' : ''),
      cx: n.x, cy: n.y, r: n.you ? 12 : 7, 'data-id': i,
    }, svg);
    if (n.you) c.setAttribute('tabindex', '0');
    if (n.you) {
      const hit = el('circle', {
        cx: n.x, cy: n.y, r: 26, fill: 'transparent', class: 'm-hit',
      }, svg);
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', () => fireMirror(svg, nodes, edges, 0));
    }
  });
  svg.querySelector('.m-node.you').addEventListener('click', () => fireMirror(svg, nodes, edges, 0));
  svg.querySelector('.m-node.you').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fireMirror(svg, nodes, edges, 0); }
  });

  const caption = document.createElement('p');
  caption.style.cssText = 'position:absolute;bottom:.75rem;left:0;right:0;text-align:center;color:var(--ink-2);font-family:ui-monospace,monospace;font-size:.75rem;line-height:1.4;padding:0 1rem;margin:0;';
  caption.innerHTML = 'Click the centre node — notice where the signal fades before reaching the third degree.';
  host.appendChild(caption);
  host.appendChild(svg);
}

function fireMirror(svg, nodes, edges, originId) {
  const visited = new Set([originId]);
  const queue = [{ id: originId, strength: 1, depth: 0 }];
  while (queue.length) {
    const { id, strength, depth } = queue.shift();
    if (strength < .1 || depth > 4) continue;
    edges.forEach((e, idx) => {
      let nextId = null;
      if (e.a === id && !visited.has(e.b)) nextId = e.b;
      else if (e.b === id && !visited.has(e.a)) nextId = e.a;
      if (nextId == null) return;
      visited.add(nextId);
      const nextStrength = strength * e.w * (e.scarred ? .35 : 1);
      const edgeNode = svg.querySelector(`.m-edge[data-idx="${idx}"]`);
      const targetNode = svg.querySelector(`.m-node[data-id="${nextId}"]`);
      setTimeout(() => {
        if (edgeNode && !e.scarred) edgeNode.classList.add('lit');
        if (targetNode) {
          targetNode.setAttribute('r', Math.max(7, 7 + nextStrength * 8));
          targetNode.style.fill = e.scarred ? 'var(--warn)' : `rgba(154,167,255,${Math.min(1, nextStrength + .3)})`;
        }
        setTimeout(() => {
          if (edgeNode) edgeNode.classList.remove('lit');
          if (targetNode && !nodes[nextId].you) {
            targetNode.setAttribute('r', 7);
            targetNode.style.fill = '';
          }
        }, 1800);
      }, depth * 400);
      queue.push({ id: nextId, strength: nextStrength, depth: depth + 1 });
    });
  }
}

export default buildMirror;
