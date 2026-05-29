import { el, clamp } from '../lib.js';

function buildNodeHealth() {
  const host = document.getElementById('nodehealth-stage');
  if (!host) return;
  const W = 400, H = 400, cx = 200, cy = 200, R = 128, N = 7;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'nh-svg', role: 'img', 'aria-labelledby': 'nh-t nh-d' });
  el('title', { id: 'nh-t' }, svg).textContent = 'Incoming load — node health';
  el('desc',  { id: 'nh-d' }, svg).textContent = 'A central node with 7 incoming connections. Click each to toggle positive or negative. The node health indicator responds to the net incoming load.';

  // 4 positive, 3 negative
  const signs = [1, 1, 1, 1, -1, -1, -1];
  const labels = ['colleague', 'friend', 'mentor', 'family', 'critic', 'conflict', 'overload'];
  const palette = { pos: '#7fffa3', neg: '#ff5d7a', hi: '#9aa7ff', warm: '#ff9a6d' };

  const senders = Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });

  // Health ring
  const healthRing = el('circle', { class: 'nh-health-ring', cx, cy, r: 46 }, svg);
  healthRing.style.stroke = palette.pos;

  // Edges (draw before nodes so nodes sit on top)
  const edgeEls = senders.map((s, i) =>
    el('line', { class: 'nh-edge ' + (signs[i] > 0 ? 'nh-pos' : 'nh-neg'), x1: s.x, y1: s.y, x2: cx, y2: cy }, svg)
  );

  // Sender nodes + labels
  const senderGrps = senders.map((s, i) => {
    const g = el('g', { class: 'nh-sender', tabindex: 0, role: 'switch', 'aria-checked': String(signs[i] > 0), 'aria-label': labels[i] + ' connection' }, svg);
    el('circle', { class: 'nh-sender-node ' + (signs[i] > 0 ? 'nh-pos' : 'nh-neg'), cx: s.x, cy: s.y, r: 14 }, g);
    const ly = s.y + (s.y > cy ? 28 : -18);
    el('text', { class: 'nh-sender-label', x: s.x, y: ly, 'text-anchor': 'middle' }, g).textContent = labels[i];
    return g;
  });

  // Center
  const centerNode = el('circle', { class: 'nh-center', cx, cy, r: 22 }, svg);
  centerNode.style.stroke = palette.pos;
  el('text', { class: 'nh-center-label', x: cx, y: cy + 4, 'text-anchor': 'middle' }, svg).textContent = 'you';

  // Sum + state readout
  const sumEl = el('text', { class: 'nh-sum', x: cx, y: H - 24, 'text-anchor': 'middle' }, svg);
  const stateEl = el('text', { class: 'nh-state', x: cx, y: H - 10, 'text-anchor': 'middle' }, svg);

  host.appendChild(svg);

  function updateHealth() {
    const sum = signs.reduce((s, v) => s + v, 0);
    const ratio = sum / N;
    let state, color;
    if (ratio >= 0.4)       { state = 'generative'; color = palette.pos; }
    else if (ratio >= 0)    { state = 'stable';     color = palette.hi;  }
    else if (ratio >= -0.4) { state = 'stressed';   color = palette.warm; }
    else                    { state = 'depleted';   color = palette.neg; }
    sumEl.textContent = `net incoming: ${sum >= 0 ? '+' : ''}${sum} of ${N}`;
    stateEl.textContent = state;
    [sumEl, stateEl].forEach(e => e.setAttribute('fill', color));
    healthRing.style.stroke = color;
    healthRing.style.filter = `drop-shadow(0 0 ${10 + clamp(sum * 2, -6, 10)}px ${color})`;
    centerNode.style.stroke = color;
  }
  updateHealth();

  senderGrps.forEach((g, i) => {
    const toggle = () => {
      signs[i] *= -1;
      const pos = signs[i] > 0;
      edgeEls[i].setAttribute('class', 'nh-edge ' + (pos ? 'nh-pos' : 'nh-neg'));
      g.querySelector('.nh-sender-node').setAttribute('class', 'nh-sender-node ' + (pos ? 'nh-pos' : 'nh-neg'));
      g.setAttribute('aria-checked', String(pos));
      updateHealth();
    };
    g.addEventListener('click', toggle);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

export default buildNodeHealth;
