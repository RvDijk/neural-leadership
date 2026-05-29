import { el, clamp, rng } from '../lib.js';

function buildPrefAttach() {
  const host = document.getElementById('pref-stage');
  if (!host) return;
  const W = 400, H = 400;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pref-svg', role: 'img', 'aria-label': 'Preferential attachment network growing over time' });
  host.appendChild(svg);

  const rand = rng(99);
  let nodes = [], edges = [], nodeEls = [], edgeEls = [], running = false, stepTimer = null;

  function addNode(x, y) {
    const id = nodes.length;
    const n = { id, x, y, degree: 0 };
    nodes.push(n);
    const c = el('circle', { class: 'pref-node', cx: x, cy: y, r: 5, 'data-id': id }, svg);
    nodeEls.push(c);
    return n;
  }
  function addEdge(a, b) {
    a.degree++; b.degree++;
    edges.push({ a: a.id, b: b.id });
    const e = el('line', { class: 'pref-edge', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, svg);
    edgeEls.push(e);
    const ra = Math.min(22, 4 + a.degree * 1.4), rb = Math.min(22, 4 + b.degree * 1.4);
    nodeEls[a.id].setAttribute('r', ra);
    nodeEls[b.id].setAttribute('r', rb);
    if (a.degree > 4) nodeEls[a.id].classList.add('hub');
    if (b.degree > 4) nodeEls[b.id].classList.add('hub');
  }
  function pickTarget(exclude) {
    const total = nodes.reduce((s, n) => s + Math.max(1, n.degree), 0);
    let pick = rand() * total;
    for (const n of nodes) {
      if (n.id === exclude) continue;
      pick -= Math.max(1, n.degree);
      if (pick <= 0) return n;
    }
    return nodes.find(n => n.id !== exclude);
  }
  function step() {
    if (nodes.length >= 32) {
      running = false; clearInterval(stepTimer);
      const pb = document.getElementById('pref-play');
      if (pb) { pb.textContent = '▶ Grow'; pb.classList.remove('active'); }
      return;
    }
    const angle = rand() * Math.PI * 2;
    const r = 60 + rand() * 100;
    const x = clamp(W / 2 + Math.cos(angle) * r, 18, W - 18);
    const y = clamp(H / 2 + Math.sin(angle) * r, 18, H - 18);
    const n = addNode(x, y);
    const seen = new Set([n.id]);
    for (let k = 0; k < 20 && seen.size < Math.min(3, nodes.length); k++) {
      const t = pickTarget(n.id);
      if (t && !seen.has(t.id)) { seen.add(t.id); addEdge(n, t); }
    }
  }
  function seed() {
    addNode(W / 2, H / 2 - 52); addNode(W / 2 - 46, H / 2 + 26); addNode(W / 2 + 46, H / 2 + 26);
    addEdge(nodes[0], nodes[1]); addEdge(nodes[1], nodes[2]); addEdge(nodes[0], nodes[2]);
  }
  seed();

  const controls = document.createElement('div');
  controls.className = 'pref-controls';
  controls.innerHTML = `
    <button class="emp-btn" id="pref-play">▶ Grow</button>
    <button class="emp-btn" id="pref-step">Step</button>
    <button class="emp-btn" id="pref-reset">Reset</button>
  `;
  host.appendChild(controls);

  document.getElementById('pref-play').addEventListener('click', ev => {
    running = !running;
    ev.target.textContent = running ? '⏸ Pause' : '▶ Grow';
    ev.target.classList.toggle('active', running);
    if (running) stepTimer = setInterval(step, 380);
    else clearInterval(stepTimer);
  });
  document.getElementById('pref-step').addEventListener('click', () => { if (!running) step(); });
  document.getElementById('pref-reset').addEventListener('click', () => {
    running = false; clearInterval(stepTimer);
    nodeEls.forEach(n => n.remove()); edgeEls.forEach(e => e.remove());
    nodes = []; edges = []; nodeEls = []; edgeEls = [];
    seed();
    const pb = document.getElementById('pref-play');
    pb.textContent = '▶ Grow'; pb.classList.remove('active');
  });
}

export default buildPrefAttach;
