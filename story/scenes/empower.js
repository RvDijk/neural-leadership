import { el, onceVisible, rng } from '../lib.js';

function buildEmpower() {
  const host = document.getElementById('empower-stage');
  if (!host) return;

  const W = 560, H = 400;
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'empower-svg', role: 'img',
    'aria-labelledby': 'emp-t emp-d',
  });
  el('title', { id: 'emp-t' }, svg).textContent = 'Star topology vs distributed mesh — what happens when the leader node is removed';
  el('desc',  { id: 'emp-d' }, svg).textContent = 'Left panel: a star topology where the leader is the sole deep node. Right panel: after co-firing empowerment, three peers have developed their own strong edges. The toggle button removes the leader from each panel to reveal resilience.';

  // Panel divider
  el('line', { class: 'empower-divider', x1: W / 2, y1: 20, x2: W / 2, y2: H - 20 }, svg);
  el('text', { class: 'empower-panel-label', x: W / 4,     y: 18 }, svg).textContent = 'BEFORE · star topology';
  el('text', { class: 'empower-panel-label', x: W * 3 / 4, y: 18 }, svg).textContent = 'AFTER · distributed mesh';

  const rand = rng(17);

  // Helper: place N peripheral nodes in a ring around a centre
  function ring(cx, cy, r, n, idOffset) {
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      nodes.push({ id: idOffset + i, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return nodes;
  }

  const N = 8;
  // LEFT — star
  const Lcx = W / 4, Lcy = H / 2;
  const Lpeers = ring(Lcx, Lcy, 90, N, 100);
  // RIGHT — mesh
  const Rcx = W * 3 / 4, Rcy = H / 2;
  const Rpeers = ring(Rcx, Rcy, 90, N, 200);

  // ── LEFT panel: edges only to the leader ──
  const Lleader = { id: 0, x: Lcx, y: Lcy };
  const leftEdgeEls = [];
  for (const p of Lpeers) {
    leftEdgeEls.push(el('line', { class: 'emp-edge', x1: Lleader.x, y1: Lleader.y, x2: p.x, y2: p.y }, svg));
  }
  const leftPeerEls = Lpeers.map(p =>
    el('circle', { class: 'emp-node peer', cx: p.x, cy: p.y, r: 7, 'data-panel': 'left', 'data-id': p.id }, svg)
  );
  const leftLeaderEl = el('circle', { class: 'emp-node leader', cx: Lleader.x, cy: Lleader.y, r: 13, 'data-panel': 'left', 'data-id': 0 }, svg);
  el('text', { class: 'empower-panel-label', x: Lcx, y: Lcy + 28 }, svg).textContent = 'leader';

  // ── RIGHT panel: 3 empowered nodes have outgoing peer edges too ──
  const empoweredIdx = [1, 3, 6]; // which peers got co-fired
  const Rleader = { id: 1, x: Rcx, y: Rcy };
  const rightEdgeEls = [];
  for (const p of Rpeers) {
    const isEmp = empoweredIdx.includes(p.id - 200);
    rightEdgeEls.push(el('line', {
      class: 'emp-edge' + (isEmp ? ' strong' : ''),
      x1: Rleader.x, y1: Rleader.y, x2: p.x, y2: p.y,
    }, svg));
  }
  // Cross-edges between empowered peers — they now generate signal independently
  for (let a = 0; a < empoweredIdx.length; a++) {
    for (let b = a + 1; b < empoweredIdx.length; b++) {
      const pa = Rpeers[empoweredIdx[a]], pb = Rpeers[empoweredIdx[b]];
      rightEdgeEls.push(el('line', { class: 'emp-edge strong', x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y }, svg));
    }
  }
  // Each empowered peer has edges to their neighbours
  empoweredIdx.forEach(ei => {
    const src = Rpeers[ei];
    const next = Rpeers[(ei + 1) % N], prev = Rpeers[(ei + N - 1) % N];
    rightEdgeEls.push(el('line', { class: 'emp-edge strong', x1: src.x, y1: src.y, x2: next.x, y2: next.y }, svg));
    rightEdgeEls.push(el('line', { class: 'emp-edge strong', x1: src.x, y1: src.y, x2: prev.x, y2: prev.y }, svg));
  });

  const rightPeerEls = Rpeers.map((p, i) =>
    el('circle', {
      class: 'emp-node ' + (empoweredIdx.includes(i) ? 'empowered' : 'peer'),
      cx: p.x, cy: p.y, r: empoweredIdx.includes(i) ? 9 : 7,
      'data-panel': 'right', 'data-id': p.id,
    }, svg)
  );
  const rightLeaderEl = el('circle', { class: 'emp-node leader', cx: Rleader.x, cy: Rleader.y, r: 13, 'data-panel': 'right', 'data-id': 1 }, svg);
  el('text', { class: 'empower-panel-label', x: Rcx, y: Rcy + 28 }, svg).textContent = 'leader';

  host.appendChild(svg);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'empower-controls';
  controls.innerHTML = `
    <button class="emp-btn" id="emp-remove">Remove the leader → what survives?</button>
    <button class="emp-btn" id="emp-reset">Restore</button>
  `;
  host.appendChild(controls);

  let removed = false;

  document.getElementById('emp-remove').addEventListener('click', () => {
    if (removed) return;
    removed = true;
    document.getElementById('emp-remove').classList.add('active');

    // Left: leader vanishes → all left peers become isolated (no connections remain)
    leftLeaderEl.classList.add('removed');
    leftEdgeEls.forEach(e => { e.classList.add('severed'); });
    leftPeerEls.forEach(n => {
      setTimeout(() => n.classList.add('isolated'), 300 + Math.random() * 400);
    });

    // Right: leader vanishes → empowered peers hold; non-empowered lose only half their edges
    rightLeaderEl.classList.add('removed');
    rightEdgeEls.forEach(e => {
      if (!e.classList.contains('strong')) e.classList.add('severed');
    });
    // Non-empowered peers become partially isolated but not fully
    rightPeerEls.forEach((n, i) => {
      if (!empoweredIdx.includes(i)) {
        setTimeout(() => n.style.opacity = '0.45', 400);
      }
    });
  });

  document.getElementById('emp-reset').addEventListener('click', () => {
    removed = false;
    document.getElementById('emp-remove').classList.remove('active');
    leftLeaderEl.classList.remove('removed');
    leftEdgeEls.forEach(e => e.classList.remove('severed'));
    leftPeerEls.forEach(n => n.classList.remove('isolated'));
    rightLeaderEl.classList.remove('removed');
    rightEdgeEls.forEach(e => e.classList.remove('severed'));
    rightPeerEls.forEach(n => { n.style.opacity = ''; });
  });

  onceVisible(host, () => {
    const strongEdges = [...svg.querySelectorAll('.emp-edge.strong')];
    strongEdges.forEach((edge, i) => {
      setTimeout(() => {
        edge.style.transition = 'none';
        edge.style.opacity = '0';
        requestAnimationFrame(() => {
          edge.style.transition = 'opacity .6s var(--ease-hebbian)';
          edge.style.opacity = '';
        });
      }, i * 80);
    });
  });
}

export default buildEmpower;
