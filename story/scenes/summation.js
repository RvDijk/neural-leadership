import { el, clamp } from '../lib.js';

function buildSummation() {
  const host = document.getElementById('sum-stage');
  if (!host) return;
  const svg = el('svg', {
    viewBox: '0 0 400 400', class: 'sum-svg', role: 'img',
    'aria-labelledby': 'sum-t sum-d',
  });
  el('title', { id: 'sum-t' }, svg).textContent = 'Summation — four weighted inputs converging on a target neuron';
  el('desc',  { id: 'sum-d' }, svg).textContent = 'Four input nodes feed into a target node through weighted connections. The target fires only when the weighted sum of active inputs exceeds the threshold.';

  // 4 inputs along the left
  const inputs = [
    { y: 80,  w: 0.4, label: 'peer A · w=0.4', x: 60 },
    { y: 160, w: 0.6, label: 'peer B · w=0.6', x: 60 },
    { y: 240, w: 0.3, label: 'leader · w=0.3', x: 60 },
    { y: 320, w: 0.5, label: 'data · w=0.5',   x: 60 },
  ];
  const tx = 300, ty = 200;
  const threshold = 1.0;

  // Lines first
  const lines = inputs.map(inp => {
    const ln = el('line', { class: 'sum-line', x1: inp.x, y1: inp.y, x2: tx, y2: ty }, svg);
    return ln;
  });

  // Inputs
  const inputGroups = inputs.map((inp, i) => {
    const g = el('g', { class: 'sum-input', tabindex: 0, role: 'switch', 'aria-checked': 'false' }, svg);
    el('circle', { cx: inp.x, cy: inp.y, r: 18 }, g);
    el('text', { x: inp.x, y: inp.y + 4 }, g).textContent = inp.w.toFixed(1);
    el('text', { x: inp.x - 26, y: inp.y + 4, 'text-anchor': 'end' }, g).textContent = inp.label.split(' · ')[0];
    g.dataset.idx = i;
    g.dataset.on = 'false';
    return g;
  });

  // Target neuron
  const tgtG = el('g', { class: 'sum-target' }, svg);
  el('circle', { cx: tx, cy: ty, r: 32 }, tgtG);
  el('text', { x: tx, y: ty + 5 }, tgtG).textContent = 'Σ';

  // Threshold bar at bottom
  const barX = 60, barY = 380, barW = 280, barH = 14;
  el('rect', { class: 'sum-bar-bg', x: barX, y: barY - barH, width: barW, height: barH, rx: 4 }, svg);
  const fill = el('rect', { class: 'sum-bar-fill', x: barX, y: barY - barH, width: 0, height: barH, rx: 4 }, svg);
  const threshX = barX + barW * (threshold / 1.8);
  el('line', { class: 'sum-threshold-line', x1: threshX, y1: barY - barH - 4, x2: threshX, y2: barY + 4 }, svg);
  el('text', { class: 'sum-bar-label', x: threshX, y: barY + 16, 'text-anchor': 'middle' }, svg).textContent = `θ = ${threshold}`;
  const sumLabel = el('text', { class: 'sum-bar-label', x: barX, y: barY - barH - 6 }, svg);
  sumLabel.textContent = 'Σ w·x = 0.0';

  host.appendChild(svg);

  function update() {
    let sum = 0;
    inputGroups.forEach((g, i) => {
      const on = g.dataset.on === 'true';
      lines[i].classList.toggle('active', on);
      if (on) sum += inputs[i].w;
    });
    const ratio = clamp(sum / 1.8, 0, 1);
    fill.setAttribute('width', barW * ratio);
    fill.classList.toggle('over', sum >= threshold);
    sumLabel.textContent = `Σ w·x = ${sum.toFixed(2)}`;
    const fired = sum >= threshold;
    tgtG.classList.toggle('fired', fired);
    return fired;
  }

  inputGroups.forEach((g) => {
    const toggle = () => {
      const wasOn = g.dataset.on === 'true';
      const now = !wasOn;
      g.dataset.on = String(now);
      g.classList.toggle('on', now);
      g.setAttribute('aria-checked', String(now));
      update();
    };
    g.addEventListener('click', toggle);
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

export default buildSummation;
