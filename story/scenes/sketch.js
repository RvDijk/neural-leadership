import { el, clamp } from '../lib.js';

function buildSketch() {
  const host = document.getElementById('sketch-stage');
  if (!host) return;
  const W = 400, H = 400;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sketch-svg' });
  host.appendChild(svg);
  const help = document.createElement('p');
  help.className = 'sk-help';
  help.textContent = 'Drag any node · Click two nodes to toggle an edge · Edges fade with time';
  host.appendChild(help);

  const labels = ['you', 'peer', 'mentor', 'team', 'partner'];
  const nodes = [
    { x: W * .50, y: H * .35, label: 'you' },
    { x: W * .25, y: H * .55, label: 'peer' },
    { x: W * .75, y: H * .55, label: 'mentor' },
    { x: W * .35, y: H * .80, label: 'team' },
    { x: W * .65, y: H * .80, label: 'partner' },
  ];
  let edges = [
    { a: 0, b: 1, strength: 1 },
    { a: 0, b: 2, strength: 1 },
    { a: 1, b: 3, strength: 1 },
    { a: 2, b: 4, strength: 1 },
  ];
  const edgeLayer = el('g', {}, svg);
  const nodeLayer = el('g', {}, svg);
  const labelLayer = el('g', {}, svg);

  const nodeEls = nodes.map((n, i) => {
    const c = el('circle', { class: 'sk-node', cx: n.x, cy: n.y, r: 14, 'data-i': i, tabindex: 0, role: 'button', 'aria-label': `Node ${n.label}` }, nodeLayer);
    el('text', { class: 'sk-label', x: n.x, y: n.y + 28 }, labelLayer).textContent = n.label;
    return c;
  });
  const labelEls = [...labelLayer.querySelectorAll('text')];

  const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgeMap = new Map();
  function renderEdges() {
    edgeLayer.innerHTML = '';
    edgeMap.clear();
    edges.forEach(e => {
      const a = nodes[e.a], b = nodes[e.b];
      const ln = el('line', {
        class: 'sk-edge' + (e.fresh ? ' fresh' : ''),
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        'stroke-opacity': clamp(e.strength, 0.05, 1)
      }, edgeLayer);
      edgeMap.set(edgeKey(e.a, e.b), ln);
    });
  }
  renderEdges();

  // Edge decay: every second, weaken edges; below 0.05 disappear
  const decayTimer = setInterval(() => {
    let dirty = false;
    edges.forEach(e => {
      const prev = e.strength;
      e.strength = Math.max(0, e.strength - 0.015);
      if (e.fresh && Date.now() - e.freshAt > 1500) { delete e.fresh; delete e.freshAt; dirty = true; }
      if (Math.abs(e.strength - prev) > 0.001) {
        const ln = edgeMap.get(edgeKey(e.a, e.b));
        if (ln) ln.setAttribute('stroke-opacity', clamp(e.strength, 0.05, 1));
      }
    });
    const before = edges.length;
    edges = edges.filter(e => e.strength > 0.04);
    if (edges.length !== before || dirty) renderEdges();
  }, 1000);

  // Click to toggle edge between two selected nodes
  let selected = null;
  nodeEls.forEach((cEl, i) => {
    cEl.addEventListener('click', ev => {
      if (cEl._wasDrag) { cEl._wasDrag = false; return; }
      ev.stopPropagation();
      if (selected === null) {
        selected = i;
        cEl.classList.add('selected');
        return;
      }
      const other = selected;
      nodeEls[other]?.classList.remove('selected');
      selected = null;
      if (other === i) return;
      const k = edgeKey(other, i);
      const existing = edges.find(e => edgeKey(e.a, e.b) === k);
      if (existing) {
        edges = edges.filter(e => e !== existing);
      } else {
        edges.push({ a: other, b: i, strength: 1, fresh: true, freshAt: Date.now() });
      }
      renderEdges();
    });
    cEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cEl.click(); }
    });

    // Drag
    let dragging = false, startX = 0, startY = 0, moved = false;
    const onDown = ev => {
      dragging = true; moved = false;
      const p = ev.touches ? ev.touches[0] : ev;
      startX = p.clientX; startY = p.clientY;
      cEl.classList.add('dragging');
      ev.preventDefault();
    };
    const onMove = ev => {
      if (!dragging) return;
      const p = ev.touches ? ev.touches[0] : ev;
      const rect = svg.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const dx = (p.clientX - startX) * sx;
      const dy = (p.clientY - startY) * sy;
      if (Math.hypot(dx, dy) > 3) moved = true;
      const nx = clamp(nodes[i].x + dx, 20, W - 20);
      const ny = clamp(nodes[i].y + dy, 20, H - 30);
      nodes[i].x = nx; nodes[i].y = ny;
      startX = p.clientX; startY = p.clientY;
      cEl.setAttribute('cx', nx);
      cEl.setAttribute('cy', ny);
      labelEls[i].setAttribute('x', nx);
      labelEls[i].setAttribute('y', ny + 28);
      // Update connected edges in place
      edges.forEach(e => {
        if (e.a !== i && e.b !== i) return;
        const ln = edgeMap.get(edgeKey(e.a, e.b));
        if (!ln) return;
        const a = nodes[e.a], b = nodes[e.b];
        ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
        ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      });
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      cEl.classList.remove('dragging');
      cEl._wasDrag = moved;
    };
    cEl.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    cEl.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  });

  // Reset button
  const reset = document.createElement('button');
  reset.className = 'sk-reset';
  reset.type = 'button';
  reset.textContent = '↺ Reset sketch';
  host.appendChild(reset);
  reset.addEventListener('click', () => {
    nodes.forEach((n, i) => {
      n.x = [W * .50, W * .25, W * .75, W * .35, W * .65][i];
      n.y = [H * .35, H * .55, H * .55, H * .80, H * .80][i];
      nodeEls[i].setAttribute('cx', n.x);
      nodeEls[i].setAttribute('cy', n.y);
      labelEls[i].setAttribute('x', n.x);
      labelEls[i].setAttribute('y', n.y + 28);
    });
    edges = [
      { a: 0, b: 1, strength: 1 },
      { a: 0, b: 2, strength: 1 },
      { a: 1, b: 3, strength: 1 },
      { a: 2, b: 4, strength: 1 },
    ];
    renderEdges();
    if (selected !== null) { nodeEls[selected]?.classList.remove('selected'); selected = null; }
  });

  // Stop decay timer if the section detaches (no-op for current static page, harmless)
  window.addEventListener('beforeunload', () => clearInterval(decayTimer));
}

export default buildSketch;
