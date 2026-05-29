import { el, onceVisible } from '../lib.js';

function buildWeakTies() {
  const host = document.getElementById('weakties-stage');
  if (!host) return;
  const W = 400, H = 400;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'weakties-svg', role: 'img', 'aria-label': 'Two clusters connected by a single bridge edge' });

  const mkCluster = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  const L = mkCluster(110, 200, 72, 6);
  const R = mkCluster(290, 200, 72, 6);

  // Intra-cluster edges
  [L, R].forEach(cl => {
    for (let i = 0; i < cl.length; i++)
      for (let j = i + 1; j < cl.length; j++)
        el('line', { class: 'wt-edge wt-strong', x1: cl[i].x, y1: cl[i].y, x2: cl[j].x, y2: cl[j].y }, svg);
  });

  // Bridge edge
  const bSrc = L[0], bDst = R[3];
  const bridgeEl = el('line', { class: 'wt-edge wt-bridge', x1: bSrc.x, y1: bSrc.y, x2: bDst.x, y2: bDst.y }, svg);

  // Nodes
  L.forEach((n, i) => el('circle', { class: 'wt-node' + (i === 0 ? ' source' : ''), cx: n.x, cy: n.y, r: i === 0 ? 10 : 7 }, svg));
  R.forEach((n, i) => el('circle', { class: 'wt-node' + (i === 3 ? ' target' : ''), cx: n.x, cy: n.y, r: i === 3 ? 10 : 7 }, svg));
  el('text', { class: 'wt-label', x: 110, y: 296, 'text-anchor': 'middle' }, svg).textContent = 'your world';
  el('text', { class: 'wt-label', x: 290, y: 296, 'text-anchor': 'middle' }, svg).textContent = 'different world';

  const statusEl = el('text', { class: 'wt-status', x: W / 2, y: H - 14, 'text-anchor': 'middle' }, svg);
  statusEl.textContent = 'bridge active';
  statusEl.setAttribute('fill', '#7fffa3');

  host.appendChild(svg);

  const controls = document.createElement('div');
  controls.className = 'wt-controls';
  controls.innerHTML = '<button class="emp-btn" id="wt-toggle">Remove the bridge</button>';
  host.appendChild(controls);

  let bridgeActive = true;

  function spawnParticle() {
    if (!bridgeActive) return;
    const p = el('circle', { r: 5 }, svg);
    p.style.fill = '#7fffa3';
    p.style.filter = 'drop-shadow(0 0 5px #7fffa3)';
    p.style.pointerEvents = 'none';
    p.animate(
      [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${bDst.x - bSrc.x}px,${bDst.y - bSrc.y}px)`, opacity: 0 }],
      { duration: 1600, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }
    );
    p.setAttribute('cx', bSrc.x); p.setAttribute('cy', bSrc.y);
    setTimeout(() => p.remove(), 1700);
  }

  let particleTimer;
  onceVisible(svg, () => {
    particleTimer = setInterval(spawnParticle, 2000);
    spawnParticle();
  });

  document.getElementById('wt-toggle').addEventListener('click', ev => {
    bridgeActive = !bridgeActive;
    bridgeEl.style.opacity = bridgeActive ? '' : '0.07';
    ev.target.textContent = bridgeActive ? 'Remove the bridge' : 'Restore the bridge';
    ev.target.classList.toggle('active', !bridgeActive);
    statusEl.textContent = bridgeActive ? 'bridge active' : 'bridge removed — information stays local';
    statusEl.setAttribute('fill', bridgeActive ? '#7fffa3' : '#ff5d7a');
  });
}

export default buildWeakTies;
