import { el, onceVisible } from '../lib.js';

function buildMirrorNeurons() {
  const host = document.getElementById('mirror-neuron-stage');
  if (!host) return;
  const svg = el('svg', {
    viewBox: '0 0 400 400', class: 'mirror-neuron-svg', role: 'img',
    'aria-labelledby': 'mn-t mn-d',
  });
  el('title', { id: 'mn-t' }, svg).textContent = 'Mirror neurons firing across observers';
  el('desc',  { id: 'mn-d' }, svg).textContent = 'One face broadcasts an emotional state; surrounding faces mirror it as their mirror neurons fire in sympathy.';

  // Central broadcaster
  const cx = 200, cy = 200, R = 112;
  const broadcaster = makeFace(svg, cx, cy, 48, 'broadcaster');
  broadcaster.classList.add('broadcast');

  // 5 observers around
  const observers = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const fx = cx + Math.cos(a) * R, fy = cy + Math.sin(a) * R;
    const f = makeFace(svg, fx, fy, 32, `observer-${i}`);
    observers.push({ g: f, x: fx, y: fy });
  }

  // Caption labels
  el('text', { class: 'mn-label', x: cx, y: cy + 62 }, svg).textContent = 'broadcaster';
  observers.forEach((o, i) => {
    el('text', { class: 'mn-label', x: o.x, y: o.y + 46 }, svg).textContent = `observer ${i + 1}`;
  });

  host.appendChild(svg);

  // Auto-cycle: broadcaster fires → observers mirror in sequence
  onceVisible(svg, () => {
    const fire = () => {
      broadcaster.classList.add('broadcast');
      const wave = el('circle', {
        class: 'mn-wave', cx, cy, r: 48, opacity: 1,
      }, svg);
      wave.animate(
        [
          { r: 48, opacity: .9, stroke: '#ff9a6d' },
          { r: R + 20, opacity: 0, stroke: '#ff5d7a' },
        ],
        { duration: 1500, easing: 'cubic-bezier(.85,0,.15,1)', fill: 'forwards' }
      );
      setTimeout(() => wave.remove(), 1600);

      observers.forEach((o, i) => {
        setTimeout(() => o.g.classList.add('mirrored'), 500 + i * 200);
      });
      setTimeout(() => {
        broadcaster.classList.remove('broadcast');
        observers.forEach(o => o.g.classList.remove('mirrored'));
        broadcaster.classList.add('broadcast'); // keep broadcaster lit
      }, 3000);
    };
    fire();
    setInterval(fire, 5000);
  }, 0.5);
}

function makeFace(svg, cx, cy, r, id) {
  const g = el('g', { class: 'mn-face-group' }, svg);
  el('circle', { class: 'mn-face', cx, cy, r, 'data-id': id }, g);
  // Eyes
  el('circle', { class: 'mn-feature', cx: cx - r * 0.35, cy: cy - r * 0.15, r: r * 0.08 }, g);
  el('circle', { class: 'mn-feature', cx: cx + r * 0.35, cy: cy - r * 0.15, r: r * 0.08 }, g);
  // Mouth — line
  el('path', {
    class: 'mn-feature',
    d: `M ${cx - r * 0.35} ${cy + r * 0.3} Q ${cx} ${cy + r * 0.45} ${cx + r * 0.35} ${cy + r * 0.3}`,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
  }, g);
  return g.querySelector('.mn-face');
}

export default buildMirrorNeurons;
