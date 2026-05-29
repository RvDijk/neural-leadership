/* ──────────────────────────────────────────────────────────────────
   story.js — Main orchestration. Builds all SVG visualizations,
   wires interactivity, View Transitions, citations, TOC, audio.
   ────────────────────────────────────────────────────────────────── */

import { sfx, setAudioEnabled, isAudioEnabled } from './audio.js';
import * as analysis from './analysis.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent = null) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const rng = (seed) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ────────────── Register Houdini paint worklet ────────────── */
if ('paintWorklet' in CSS) {
  CSS.paintWorklet.addModule('emergence-worklet.js').catch(() => { /* ignore */ });
}

/* ────────────── Citations ────────────── */
const CITES = {
  hebb1949:    'Hebb, D. O. (1949). The Organization of Behavior. Wiley.',
  'bi-poo1998':'Bi & Poo (1998). Spike-timing-dependent synaptic plasticity. J. Neuroscience, 18(24).',
  ebb1885:     'Ebbinghaus, H. (1885). Über das Gedächtnis. — origin of the exponential forgetting curve.',
  rosen1958:   'Rosenblatt, F. (1958). The perceptron — Σwx > θ ⇒ fire.',
  pentland2014:'Pentland, A. (2014). Social Physics. — sociometric prediction of team performance.',
  riz1996:     'Rizzolatti et al. (1996). Premotor mirror neurons fire on observation as on action.',
  hatfield1993:'Hatfield, Cacioppo & Rapson (1993). Emotional Contagion.',
  gottman1999: 'Gottman & Silver (1999). 5:1 ratio of positive to negative interactions.',
  cross2004:   'Cross & Parker (2004). The Hidden Power of Social Networks.',
  jackson2019: 'Jackson (2019). The Human Network. — network position drives influence.',
  strogatz2018:'Strogatz (2018). Nonlinear Dynamics and Chaos. — attractor basins & phase transitions.',
  march1991:   'March (1991). Exploration and exploitation in organizational learning.',
  eurich2017:  'Eurich (2017). Insight. — 95% believe they\u2019re self-aware; 10\u201315% are.',
  eigenvalue:  'Eigenvector centrality: your influence score is proportional to the influence scores of your neighbors. A star-topology leader pools this score at one node \u2014 remove that node and the score collapses. A leader who co-develops others distributes centrality across the mesh. The network\u2019s resilience is proportional to how well the eigenvalue is spread.',
};

function wireCitations() {
  const tip = document.getElementById('cite-tooltip');
  const show = (cite, x, y) => {
    if (!cite || !CITES[cite]) return;
    tip.textContent = CITES[cite];
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = clamp(x + 12, 8, window.innerWidth  - r.width  - 8) + 'px';
    tip.style.top  = clamp(y + 12, 8, window.innerHeight - r.height - 8) + 'px';
  };
  document.querySelectorAll('.cite-inline').forEach(c => {
    c.addEventListener('mouseenter', e => show(c.dataset.cite, e.clientX, e.clientY));
    c.addEventListener('mousemove',  e => show(c.dataset.cite, e.clientX, e.clientY));
    c.addEventListener('mouseleave', () => { tip.hidden = true; });
    c.addEventListener('focus', e => {
      const r = c.getBoundingClientRect();
      show(c.dataset.cite, r.left, r.bottom);
    });
    c.addEventListener('blur', () => { tip.hidden = true; });
    c.setAttribute('tabindex', '0');
    // Click jumps to bibliography entry & highlights
    c.addEventListener('click', () => {
      const target = document.getElementById('ref-' + c.dataset.cite);
      if (!target) return;
      const details = target.closest('details');
      if (details) details.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('highlight');
      setTimeout(() => target.classList.remove('highlight'), 3000);
    });
  });
}

/* ────────────── TOC ────────────── */
function wireTOC() {
  const toggle = document.querySelector('.toc__toggle');
  const list = document.getElementById('toc-list');
  if (!toggle || !list) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.toc')) toggle.setAttribute('aria-expanded', 'false');
  });

  // Active tracking
  const links = [...list.querySelectorAll('a')];
  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(sec, a);
  });
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = map.get(e.target);
      if (!link) return;
      if (e.isIntersecting && e.intersectionRatio > 0.45) {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { threshold: [0.45, 0.7] });
  map.forEach((_, s) => obs.observe(s));
}

/* ────────────── Sound toggle ────────────── */
function wireSound() {
  const btn = document.getElementById('sound-toggle');
  const label = btn.querySelector('.sound-toggle__label');
  btn.addEventListener('click', () => {
    const next = !isAudioEnabled();
    setAudioEnabled(next);
    btn.setAttribute('aria-pressed', String(next));
    label.textContent = next ? 'sound on' : 'sound off';
    if (next) sfx.click();
  });
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE I — Edge pulse audio                                        */
/* ════════════════════════════════════════════════════════════════ */
function wireEdgeAudio() {
  const sec = document.getElementById('act-1');
  if (!sec) return;
  let fired = false;
  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !fired) {
      fired = true;
      sfx.fire();
      setTimeout(() => sfx.arrive(), 800);
      setTimeout(() => sfx.scar(),   1500);
    }
  }), { threshold: 0.5 });
  obs.observe(sec);
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE III — STDP                                                  */
/* ════════════════════════════════════════════════════════════════ */
function buildSTDP() {
  const host = document.getElementById('stdp-stage');
  if (!host) return;
  host.classList.add('stdp-stage');

  // Top: STDP curve (Δt vs ΔW)
  const curveSvg = el('svg', {
    viewBox: '0 0 400 140', class: 'stdp-curve-svg',
    role: 'img', 'aria-label': 'STDP curve — weight change as a function of timing offset',
  });
  el('line', { class: 'axis-line', x1: 200, y1: 10, x2: 200, y2: 130 }, curveSvg);
  el('line', { class: 'axis-line', x1: 10,  y1: 70, x2: 390, y2: 70  }, curveSvg);
  el('text', { class: 'axis-text', x: 8,   y: 18 }, curveSvg).textContent = '+ΔW';
  el('text', { class: 'axis-text', x: 8,   y: 128 }, curveSvg).textContent = '−ΔW';
  el('text', { class: 'axis-text', x: 386, y: 64, 'text-anchor': 'end' }, curveSvg).textContent = '+Δt (pre→post)';
  el('text', { class: 'axis-text', x: 14,  y: 64 }, curveSvg).textContent = '−Δt (post→pre)';

  // Build the canonical STDP curve as a path: exp decays on both sides, flipped
  const pts = [];
  for (let dt = -100; dt <= 100; dt += 2) {
    const dw = dt > 0
      ? 0.6 * Math.exp(-dt / 25)
      : -0.55 * Math.exp(dt / 25);
    const x = 200 + dt * 1.8;
    const y = 70 - dw * 100;
    pts.push(`${x},${y}`);
  }
  el('path', {
    class: 'curve-path',
    d: 'M ' + pts.join(' L '),
  }, curveSvg);

  const marker = el('circle', { class: 'marker', cx: 200, cy: 70, r: 5 }, curveSvg);
  host.appendChild(curveSvg);

  // Middle: spike visualization
  const spikes = document.createElement('div');
  spikes.className = 'stdp-spikes';
  spikes.innerHTML = `
    <div class="stdp-neuron" id="stdp-pre">
      <div class="stdp-neuron__circle"></div>
      <span class="stdp-neuron__label">pre · context</span>
    </div>
    <div class="stdp-neuron" id="stdp-post">
      <div class="stdp-neuron__circle"></div>
      <span class="stdp-neuron__label">post · ask</span>
    </div>
  `;
  host.appendChild(spikes);

  // Slider
  const controls = document.createElement('div');
  controls.innerHTML = `
    <input type="range" id="stdp-slider" class="stdp-slider" min="-80" max="80" value="20" step="1" aria-label="Timing offset between pre and post spikes" />
    <div class="stdp-readout">
      <span>Δt = <span class="delta" id="stdp-dt">+20 ms</span></span>
      <span>ΔW = <span class="change pos" id="stdp-dw">+0.27</span></span>
    </div>
  `;
  host.appendChild(controls);

  const slider = controls.querySelector('#stdp-slider');
  const dtOut = controls.querySelector('#stdp-dt');
  const dwOut = controls.querySelector('#stdp-dw');
  const pre  = spikes.querySelector('#stdp-pre');
  const post = spikes.querySelector('#stdp-post');

  function compute(dt) {
    const dw = dt > 0
      ? 0.6 * Math.exp(-dt / 25)
      : -0.55 * Math.exp(dt / 25);
    dtOut.textContent = `${dt >= 0 ? '+' : ''}${dt} ms`;
    dwOut.textContent = `${dw >= 0 ? '+' : ''}${dw.toFixed(2)}`;
    dwOut.className = 'change ' + (dw >= 0 ? 'pos' : 'neg');
    const x = 200 + dt * 1.8;
    const y = 70 - dw * 100;
    marker.setAttribute('cx', x);
    marker.setAttribute('cy', y);
    marker.setAttribute('fill', dw >= 0 ? '#7fffa3' : '#ff5d7a');
  }
  compute(20);

  let demoTimer;
  function demo(dt) {
    clearTimeout(demoTimer);
    pre.classList.remove('fired'); post.classList.remove('fired');
    // dt > 0 means pre fires first then post; dt < 0 means post first then pre
    const preDelay = dt > 0 ? 0 : Math.abs(dt) * 4;
    const postDelay = dt > 0 ? dt * 4 : 0;
    setTimeout(() => { pre.classList.add('fired');  sfx.fire(); }, preDelay);
    setTimeout(() => { post.classList.add('fired'); sfx.arrive(); }, postDelay);
    demoTimer = setTimeout(() => {
      pre.classList.remove('fired');
      post.classList.remove('fired');
    }, Math.max(preDelay, postDelay) + 700);
  }

  slider.addEventListener('input', () => {
    const dt = +slider.value;
    compute(dt);
  });
  slider.addEventListener('change', () => demo(+slider.value));

  // Auto-demo on first view
  let demoed = false;
  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !demoed) { demoed = true; demo(20); }
  }), { threshold: 0.5 });
  obs.observe(host);
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE IV — Decay (interactive reinforcement)                      */
/* ════════════════════════════════════════════════════════════════ */
function wireDecay() {
  const sec = document.querySelector('.scene--decay');
  if (!sec) return;
  sec.querySelectorAll('.curve').forEach(c => {
    c.style.cursor = 'pointer';
    c.addEventListener('click', () => {
      // "Reinforce" — quickly redraw the curve
      c.style.transition = 'stroke-dashoffset 0s';
      c.style.strokeDashoffset = '1';
      requestAnimationFrame(() => {
        c.style.transition = 'stroke-dashoffset 1.5s var(--ease-decay)';
        c.style.strokeDashoffset = '0';
      });
      sfx.reinforce();
    });
  });
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE V — Summation                                               */
/* ════════════════════════════════════════════════════════════════ */
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
      const wasFired = tgtG.classList.contains('fired');
      const fired = update();
      sfx.click();
      if (fired && !wasFired) sfx.threshold();
    };
    g.addEventListener('click', toggle);
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE VI — Cascade                                                */
/* ════════════════════════════════════════════════════════════════ */
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

  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
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
          if (d === 1) sfx.fire();
          if (d === 2) sfx.arrive();
        }, 400 + d * 550);
      }
    }
    setTimeout(() => drawFeedbackLoop(svg, nodeEls), 400 + 4 * 550);
    obs.unobserve(e.target);
  }), { threshold: 0.4 });
  obs.observe(svg);
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

/* ════════════════════════════════════════════════════════════════ */
/* SCENE VII — Mirror neurons                                        */
/* ════════════════════════════════════════════════════════════════ */
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
  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const fire = () => {
      broadcaster.classList.add('broadcast');
      // Send concentric wave
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

      sfx.fire();
      observers.forEach((o, i) => {
        setTimeout(() => {
          o.g.classList.add('mirrored');
          sfx.arrive();
        }, 500 + i * 200);
      });
      setTimeout(() => {
        broadcaster.classList.remove('broadcast');
        observers.forEach(o => o.g.classList.remove('mirrored'));
        broadcaster.classList.add('broadcast'); // keep broadcaster lit
      }, 3000);
    };
    fire();
    setInterval(fire, 5000);
    obs.unobserve(e.target);
  }), { threshold: 0.5 });
  obs.observe(svg);
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

/* ════════════════════════════════════════════════════════════════ */
/* SCENE VIII — 5:1 ratio (interactive)                              */
/* ════════════════════════════════════════════════════════════════ */
function wireRatio() {
  const pos = document.getElementById('pos-tokens');
  const neg = document.getElementById('neg-tokens');
  const beam = document.getElementById('beam');
  const ratioNum = document.getElementById('ratio-num');
  const ratioState = document.getElementById('ratio-state');
  if (!pos || !neg || !beam) return;

  let nPos = 5, nNeg = 1;
  function render() {
    pos.innerHTML = ''; neg.innerHTML = '';
    for (let i = 0; i < nPos; i++) {
      const s = document.createElement('span');
      s.className = 't';
      pos.appendChild(s);
    }
    for (let i = 0; i < nNeg; i++) {
      const s = document.createElement('span');
      s.className = 't t--neg';
      neg.appendChild(s);
    }
    // Compute weighted moment: each negative counts 5x
    const moment = nNeg * 5 - nPos;
    const tilt = clamp(moment * 2.5, -25, 25);
    beam.style.setProperty('--scale-tilt', `${tilt}deg`);

    // Ratio readout
    const r = nNeg === 0 ? Infinity : nPos / nNeg;
    ratioNum.textContent = nNeg === 0 ? '∞' : `${r.toFixed(1)} : 1`;
    let state, klass;
    if (r >= 5) { state = 'healthy';  klass = 'healthy'; }
    else if (r >= 3) { state = 'tipping'; klass = 'tipping'; }
    else { state = 'failed'; klass = 'failed'; }
    ratioState.textContent = state;
    ratioState.className = klass;
  }
  render();

  document.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      const wasFailed = ratioState.classList.contains('failed');
      if (act === 'add-pos') nPos = Math.min(20, nPos + 1);
      if (act === 'sub-pos') nPos = Math.max(0,  nPos - 1);
      if (act === 'add-neg') nNeg = Math.min(8,  nNeg + 1);
      if (act === 'sub-neg') nNeg = Math.max(0,  nNeg - 1);
      render();
      sfx.click();
      const nowFailed = ratioState.classList.contains('failed');
      if (nowFailed && !wasFailed) sfx.scar();
      if (!nowFailed && wasFailed) sfx.threshold();
    });
  });
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE IX — Refractory (draggable apology pulse)                   */
/* ════════════════════════════════════════════════════════════════ */
function buildRefractory() {
  const host = document.getElementById('refractory-stage');
  if (!host) return;
  const W = 400, H = 400;
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'refractory-svg', role: 'img',
    'aria-labelledby': 'ref-t ref-d',
  });
  el('title', { id: 'ref-t' }, svg).textContent = 'Refractory period and apology timing';
  el('desc',  { id: 'ref-d' }, svg).textContent = 'A horizontal timeline shows an emotional response curve after an incident; an apology pulse can be dragged to different times to see whether it lands as repair or further injury.';

  // Axes
  const baseY = 220;
  el('line', { class: 'ref-axis', x1: 40, y1: baseY, x2: W - 20, y2: baseY }, svg);
  el('text', { class: 'ref-axis-text', x: W - 20, y: baseY + 18, 'text-anchor': 'end' }, svg).textContent = 'time after incident →';

  // Refractory zone shade (too-soon zone: receiverHot > 0.55)
  el('rect', { class: 'ref-zone', x: 60, y: 40, width: 30, height: 320 }, svg);
  el('text', { class: 'ref-zone-label', x: 75, y: 18 }, svg).textContent = 'refractory';
  // Repair window (receiverHot 0.2–0.55: right moment to apologise)
  el('rect', { class: 'ref-repair-zone', x: 90, y: 40, width: 50, height: 320 }, svg);
  el('text', { class: 'ref-repair-label', x: 115, y: 30 }, svg).textContent = 'repair window';

  // Two curve segments: pre-apology (neutral) and post-apology (outcome-coloured)
  const curvePre  = el('path', { class: 'ref-curve-pre',  d: '' }, svg);
  const curvePost = el('path', { class: 'ref-curve-post', d: '' }, svg);
  const incident = el('circle', { class: 'ref-incident', cx: 60, cy: baseY, r: 7 }, svg);
  const apologyX0 = 280;
  const apology = el('circle', { class: 'ref-apology', cx: apologyX0, cy: baseY, r: 9 }, svg);
  el('text', { class: 'ref-axis-text', x: 60, y: baseY - 130, 'text-anchor': 'middle' }, svg).textContent = 'incident';
  const apologyLabel = el('text', { class: 'ref-axis-text', x: apologyX0, y: baseY + 30, 'text-anchor': 'middle' }, svg);
  apologyLabel.textContent = 'apology — drag me';
  const outcome = el('text', { class: 'ref-outcome', x: W / 2, y: 380 }, svg);

  host.appendChild(svg);

  function buildCurve(ax) {
    const t0 = 60;
    const prePts = [], postPts = [];
    for (let x = t0; x <= W - 20; x += 4) {
      const t = x - t0;
      let y = baseY - 130 * Math.exp(-t / 50);
      const at = ax - t0;
      const dt = t - at;
      if (dt >= 0) {
        const receiverHot = Math.exp(-at / 50);
        let kind;
        if (receiverHot > 0.55) kind = 'amplify';
        else if (receiverHot > 0.2) kind = 'repair';
        else kind = 'fade';
        const pulseEnv = 60 * Math.exp(-dt / 40);
        if (kind === 'amplify') y -= pulseEnv * 1.0;
        else if (kind === 'repair') y += pulseEnv * 0.9;
        else y += pulseEnv * 0.25 * (1 - (at - 220) / 100);
        postPts.push(`${x},${y.toFixed(1)}`);
      } else {
        prePts.push(`${x},${y.toFixed(1)}`);
      }
    }
    // Bridge pre and post seamlessly
    if (prePts.length && postPts.length) postPts.unshift(prePts[prePts.length - 1]);
    curvePre.setAttribute('d', prePts.length > 1 ? 'M ' + prePts.join(' L ') : '');
    curvePost.setAttribute('d', postPts.length > 1 ? 'M ' + postPts.join(' L ') : '');

    const at = ax - t0;
    const receiverHot = Math.exp(-at / 50);
    let kind, msg;
    if (receiverHot > 0.55) { kind = 'amplify'; msg = 'too soon — the apology confirms threat'; }
    else if (receiverHot > 0.2) { kind = 'repair'; msg = 'lands as genuine repair'; }
    else { kind = 'fade'; msg = 'too late — the lower weight has become baseline'; }
    outcome.textContent = msg;
    const postColor = kind === 'repair' ? '#7fffa3' : (kind === 'amplify' ? '#ff5d7a' : '#ff9a6d');
    outcome.setAttribute('fill', postColor);
    curvePost.setAttribute('stroke', postColor);
    curvePost.style.filter = `drop-shadow(0 0 6px ${postColor})`;
  }
  buildCurve(apologyX0);

  // Drag apology
  let dragging = false;
  const move = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const px = (clientX - rect.left) * (W / rect.width);
    const ax = clamp(px, 80, W - 30);
    apology.setAttribute('cx', ax);
    apologyLabel.setAttribute('x', ax);
    buildCurve(ax);
  };
  svg.addEventListener('pointerdown', e => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    move(e.clientX);
  });
  svg.addEventListener('pointermove', e => {
    if (dragging) move(e.clientX);
  });
  svg.addEventListener('pointerup', () => { dragging = false; });
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE X — Cut vertex                                              */
/* ════════════════════════════════════════════════════════════════ */
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

  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    setTimeout(() => {
      svg.querySelector('.vertex').classList.add('removed');
      svg.querySelectorAll('.bridge').forEach(b => b.classList.add('removed'));
      sfx.scar();
    }, 1600);
    obs.unobserve(e.target);
  }), { threshold: 0.45 });
  obs.observe(svg);
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE XI — Attractor (Three.js lazy mount)                        */
/* ════════════════════════════════════════════════════════════════ */
function wireAttractor() {
  const host = document.getElementById('attractor-stage');
  if (!host) return;
  let mounted = false;
  const obs = new IntersectionObserver(es => es.forEach(async e => {
    if (e.isIntersecting && !mounted) {
      mounted = true;
      const { mountAttractor } = await import('./attractor.js');
      mountAttractor(host);
      obs.unobserve(e.target);
    }
  }), { threshold: 0.3 });
  obs.observe(host);
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE XIII — Sarah's three futures (branching + View Transitions) */
/* ════════════════════════════════════════════════════════════════ */
function buildFutures() {
  const host = document.getElementById('futures-stage');
  if (!host) return;
  let currentFuture = 'neutral';

  function render(future) {
    host.innerHTML = '';
    const svg = el('svg', {
      viewBox: '0 0 400 400', class: 'futures-svg', role: 'img',
      'aria-labelledby': 'fut-t fut-d',
    });
    el('title', { id: 'fut-t' }, svg).textContent = `Sarah's network — future ${future}`;
    el('desc',  { id: 'fut-d' }, svg).textContent = futureDesc(future);

    const center = { x: 200, y: 200 };
    const peers = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      const r = 120;
      peers.push({ x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r });
    }

    // Edge config per future
    const cfg = {
      neutral:   { okFrac: 0.6, scarFrac: 0.2, faded: 0.2 },
      immediate: { okFrac: 0.3, scarFrac: 0.5, faded: 0.2 },   // amygdala-hot apology amplifies
      patient:   { okFrac: 0.8, scarFrac: 0.1, faded: 0.1 },   // best outcome
      silence:   { okFrac: 0.2, scarFrac: 0.5, faded: 0.3 },   // network re-routes
    };
    const c = cfg[future] || cfg.neutral;

    peers.forEach((p, i) => {
      const roll = (i * 31 + 7) % 100 / 100;
      let cls = 'fut-edge', opacity = .8, stroke = '#9aa7ff';
      if (roll < c.okFrac) { stroke = '#7fffa3'; opacity = .9; }
      else if (roll < c.okFrac + c.scarFrac) { stroke = '#ff5d7a'; opacity = .8; }
      else { stroke = '#3d4564'; opacity = .25; }
      el('line', {
        class: cls, x1: center.x, y1: center.y, x2: p.x, y2: p.y,
        stroke, 'stroke-width': 1.5, opacity,
      }, svg);
    });
    peers.forEach((p, i) => {
      const roll = (i * 31 + 7) % 100 / 100;
      let fill = '#1a1f33', stroke = '#9aa7ff';
      if (roll < c.okFrac) { fill = '#1d3024'; stroke = '#7fffa3'; }
      else if (roll < c.okFrac + c.scarFrac) { fill = '#301d24'; stroke = '#ff5d7a'; }
      else { fill = '#1a1f33'; stroke = '#3d4564'; }
      el('circle', { class: 'fut-node', cx: p.x, cy: p.y, r: 9, fill, stroke }, svg);
    });
    el('circle', { class: 'fut-node you', cx: center.x, cy: center.y, r: 14 }, svg);

    host.appendChild(svg);
  }

  render('neutral');

  function futureDesc(f) {
    return {
      neutral:   'Default network — mixed weights, some faded connections.',
      immediate: 'After A: Sarah apologizes immediately. Several connections register as further activation (red).',
      patient:   'After B: Sarah waits, then repairs with substance. Most connections heal back to green.',
      silence:   'After C: Sarah says nothing. Connections fade as the network re-routes around her.',
    }[f] || '';
  }

  const result = document.getElementById('future-result');
  const messages = {
    immediate: { text: 'Sarah calls that afternoon. Marcus hasn\'t had time to process. The apology lands as optics management, not repair. By Thursday he\'s cc\'ing their shared manager on project emails.', klass: 'bad' },
    patient:   { text: 'Four days later, Sarah asks Marcus to walk through his concerns on the project — as a thinking partner, not a debrief. Something shifts. Three weeks on, Marcus introduces her idea in a meeting as if it were a shared conclusion. In a way, it is.', klass: 'good' },
    silence:   { text: 'Nothing is said. The network doesn\'t wait — it re-routes. By the following sprint, Marcus has become the informal lead for the technical calls Sarah used to own. She notices when she\'s no longer on the invite list.', klass: 'meh' },
  };

  document.querySelectorAll('.future-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.future;
      document.querySelectorAll('.future-btn').forEach(b => b.classList.toggle('selected', b === btn));
      const msg = messages[f];
      const apply = () => {
        render(f);
        currentFuture = f;
        result.textContent = msg.text;
        result.className = 'future-result ' + msg.klass;
        sfx[f === 'patient' ? 'threshold' : 'scar']();
      };
      // View Transitions API for smooth network morphing
      if (document.startViewTransition) {
        document.startViewTransition(apply);
      } else {
        apply();
      }
    });
  });
}

/* ════════════════════════════════════════════════════════════════ */
/* SCENE XIV — Mirror (interactive, decayed signal propagation)      */
/* ════════════════════════════════════════════════════════════════ */
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
  caption.style.cssText = 'position:absolute;bottom:-2rem;left:0;right:0;text-align:center;color:var(--ink-2);font-family:ui-monospace,monospace;font-size:.8rem;';
  caption.innerHTML = '↑ click the bright node to fire a signal';
  host.appendChild(caption);
  host.appendChild(svg);
}

function fireMirror(svg, nodes, edges, originId) {
  const visited = new Set([originId]);
  const queue = [{ id: originId, strength: 1, depth: 0 }];
  sfx.fire();
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
        if (depth === 0) sfx.arrive();
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

/* ════════════════════════════════════════════════════════════════ */
/* SCENE XIII — Growing new nodes (empowerment topology)             */
/* ════════════════════════════════════════════════════════════════ */
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
    sfx.scar();

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
    setTimeout(() => sfx.threshold(), 600);
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
    sfx.click();
  });

  // Animate new connections in right panel on scroll-into-view
  let animated = false;
  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || animated) return;
    animated = true;
    // Flash the strong edges in sequence to show the co-firing moment
    const strongEdges = [...svg.querySelectorAll('.emp-edge.strong')];
    strongEdges.forEach((edge, i) => {
      setTimeout(() => {
        edge.style.transition = 'none';
        edge.style.opacity = '0';
        requestAnimationFrame(() => {
          edge.style.transition = 'opacity .6s var(--ease-hebbian)';
          edge.style.opacity = '';
        });
        if (i % 3 === 0) sfx.reinforce();
      }, i * 80);
    });
    obs.unobserve(e.target);
  }), { threshold: 0.4 });
  obs.observe(host);
}

/* ════════════════════════════════════════════════════════════════
   FINAL ACT — buildFinalAct: renders an annotated leadership graph
   ════════════════════════════════════════════════════════════════ */
function buildFinalAct() {
  const host = document.getElementById('final-stage');
  if (!host) return;
  const svg = document.getElementById('final-graph');
  if (!svg) return;

  // defs: arrow marker (thinner, smaller)
  const defs = el('defs', {}, svg);
  // markerUnits='strokeWidth' makes the marker scale with the line's stroke width
  const arrowMarker = el('marker', { id: 'arrow', markerWidth: 6, markerHeight: 6, refX: 4.5, refY: 3.5, orient: 'auto', markerUnits: 'strokeWidth' }, defs);
  // Slim, slightly open triangle to reduce visual weight
  el('path', { d: 'M0,1.5 L5,3.5 L0,5.5 z', fill: '#9aa7ff', opacity: 0.9 }, arrowMarker);

  // Node positions (arranged to reflect the diagnostic sketch)
  const positions = {
    Goal: { x: 460, y: 40, type: 'goal' },
    Decision: { x: 420, y: 120, type: 'decision' },
    Backlog: { x: 320, y: 60, type: 'system' },
    TL: { x: 160, y: 160, type: 'person' },
    DE: { x: 300, y: 160, type: 'person' },
    PM: { x: 80,  y: 300, type: 'person' },
    DataPipeline: { x: 300, y: 300, type: 'system' },
    Capacity: { x: 200, y: 340, type: 'constraint' },
  };

  const nodes = {};
  Object.entries(positions).forEach(([k, v]) => {
    const g = el('g', { class: 'final-node-group', 'data-id': k, tabindex: 0, role: 'group' }, svg);
    const r = (v.type === 'person') ? 18 : (v.type === 'system' ? 16 : 14);
    const cls = 'final-node' + (v.type === 'person' ? ' person' : v.type === 'system' ? ' system' : '');
    el('circle', { class: cls, cx: v.x, cy: v.y, r }, g);
    el('text', { class: 'final-label', x: v.x, y: v.y + r + 14, 'text-anchor': 'middle' }, g).textContent = k.replace(/([A-Z])/g, ' $1').trim();
    // Accessibility: add title + desc for each node
    el('title', { id: `final-node-${k}-t` }, g).textContent = `${k} — ${v.type}`;
    el('desc',  { id: `final-node-${k}-d` }, g).textContent = `Type: ${v.type}. Position: ${v.x}, ${v.y}.`;
    g.setAttribute('aria-labelledby', `final-node-${k}-t`);
    g.setAttribute('aria-describedby', `final-node-${k}-d`);
    v.r = r; v.id = k; nodes[k] = v;
  });

  // Edges with annotations (alignment, load)
  const edges = [
    { a: 'PM', b: 'TL', type: 'communicates_to', align: 0.6 },
    { a: 'TL', b: 'DE', type: 'depends_on', align: 0.4 },
    { a: 'Backlog', b: 'TL', type: 'influences', align: 0.5 },
    { a: 'DataPipeline', b: 'DE', type: 'blocks', load: 'high' },
    { a: 'Capacity', b: 'TL', type: 'blocks', note: 'limits capacity' },
    { a: 'TL', b: 'Decision', type: 'influences' },
    { a: 'Decision', b: 'Goal', type: 'achieves' },
  ];

  // helper: build a straight or quadratic curved path that starts/ends at circle perimeters
  function edgePath(a, b, rA, rB, curve = 0) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const sx = a.x + ux * rA, sy = a.y + uy * rA;
    const ex = b.x - ux * rB, ey = b.y - uy * rB;
    if (curve === 0) return `M ${sx} ${sy} L ${ex} ${ey}`;
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    const nx = -uy, ny = ux;
    const cx = mx + nx * curve, cy = my + ny * curve;
    return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
  }

  edges.forEach((e, i) => {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a || !b) return;
    // determine a small curve for near-horizontal overlaps
    const horiz = Math.abs(b.y - a.y) < 28 && Math.abs(b.x - a.x) > 20;
    const curve = horiz ? (b.x > a.x ? -20 : 20) : 0;
    const d = edgePath(a, b, a.r || 14, b.r || 14, curve);
    const path = el('path', { d, class: 'final-edge', 'data-idx': i, fill: 'none', 'stroke-linecap': 'round' }, svg);
    if (e.load === 'high') path.classList.add('high-load');
    if (e.align !== undefined && e.align < 0.5) path.classList.add('low-align');

    // label placement: midpoint with perpendicular offset
    const lx = (a.x + b.x) / 2;
    const ly = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const offset = 14;
    el('text', { class: 'final-signal', x: lx + nx * offset, y: ly + ny * offset, 'text-anchor': 'middle' }, svg).textContent = e.align !== undefined ? `align ${e.align}` : (e.load ? `load:${e.load}` : e.type);
  });

  // Small interactive hint: clicking stage shows a suggested insight
  const insightEl = document.getElementById('final-insight');
  // expose the graph for analysis tools
  window.finalGraph = { nodes: Object.values(nodes).map(n => ({ id: n.id, x: n.x, y: n.y, r: n.r, type: n.type })), edges };

  // small analysis controls
  const controls = document.createElement('div');
  controls.className = 'final-analysis-controls';
  controls.innerHTML = `
    <button class="btn" id="analyze-bottlenecks">Find bottlenecks</button>
    <button class="btn" id="analyze-latency">High-latency paths</button>
    <button class="btn" id="analyze-loops">Detect conflict loops</button>
    <button class="btn" id="analyze-all">Run all</button>
  `;
  host.appendChild(controls);
  const showResults = (txt) => { if (insightEl) insightEl.textContent = txt; pushEvent({ name: 'graph_analysis', props: { text: txt } }); };
  controls.querySelector('#analyze-bottlenecks').addEventListener('click', () => {
    const res = analysis.findBottleneckNodes(window.finalGraph, { top: 5 });
    showResults('Bottlenecks: ' + res.map(r => `${r.id} (cent=${r.centrality.toFixed(2)}, highLoadAdj=${r.highLoadAdj})`).join('; '));
  });
  controls.querySelector('#analyze-latency').addEventListener('click', () => {
    const res = analysis.detectHighLatencyPaths(window.finalGraph, { top: 6 });
    showResults('High-latency paths: ' + res.map(r => `${r.from}->${r.to} (d=${r.distance})`).join('; '));
  });
  controls.querySelector('#analyze-loops').addEventListener('click', () => {
    const res = analysis.detectConflictLoops(window.finalGraph, { threshold: 0.6 });
    showResults('Conflict loops: ' + (res.length ? res.map(c => `(${c.nodes.join('→')}) align=${c.meanAlign.toFixed(2)}`).join('; ') : 'none'));
  });
  controls.querySelector('#analyze-all').addEventListener('click', () => {
    const res = analysis.detectAll(window.finalGraph);
    const txt = `B:${res.bottlenecks.map(b=>b.id).join(', ')} | L:${res.latPaths.map(l=>l.from+'→'+l.to).join(', ')} | C:${res.conflictLoops.length}`;
    showResults(txt);
  });
  host.addEventListener('click', () => {
    if (!insightEl) return;
    insightEl.textContent = 'Insight: The visible bottleneck is the Data Pipeline — high load and low TL–DE alignment create hidden dependency latency. Prioritize pipeline stability or reduce coupling.';
    sfx.click();
  });
}

/* ════════════════════════════════════════════════════════════════ */
/* Boot                                                              */
/* ════════════════════════════════════════════════════════════════ */
wireCitations();
wireTOC();
wireSound();
wireEdgeAudio();
buildSTDP();
wireDecay();
buildSummation();
buildCascade();
buildMirrorNeurons();
wireRatio();
buildRefractory();
buildCutVertex();
wireAttractor();
buildEmpower();
buildFutures();
buildMirror();
buildFinalAct();
// --- Metadata, read-time, progress bar, and lightweight analytics/data-layer ---
function enhanceMetadata() {
  try {
    const title = document.querySelector('.title__inner h1')?.innerText || document.title;
    const descEl = document.querySelector('.exec-summary');
    const desc = descEl ? descEl.innerText : document.querySelector('meta[name="description"]').getAttribute('content');
    document.title = title.split('\n')[0];
    const set = (sel, val) => {
      const m = document.querySelector(sel);
      if (m) m.setAttribute('content', val);
      else {
        const el = document.createElement('meta');
        if (sel.startsWith('meta[name')) {
          const name = sel.match(/name=\"([^\"]+)\"/)[1]; el.setAttribute('name', name);
        } else if (sel.startsWith('meta[property')) {
          const prop = sel.match(/property=\"([^\"]+)\"/)[1]; el.setAttribute('property', prop);
        }
        el.setAttribute('content', val);
        document.head.appendChild(el);
      }
    };
    set('meta[property="og:title"]', title);
    set('meta[property="og:description"]', desc);
    // og:image left as default banner.svg unless page provides data-og-image
    const provided = document.querySelector('meta[name="og-image"]');
    if (!provided) set('meta[property="og:image"]', '/story/banner.svg');
  } catch (e) { console.warn(e); }
}

function computeReadTime() {
  const txt = document.body.innerText || '';
  const words = txt.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const el = document.getElementById('read-time');
  if (el) el.textContent = `≈ ${minutes} min read`;
  return minutes;
}

function initProgressAndScrollDepth() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  const thresholds = [25,50,75,100];
  const fired = new Set();
  const onScroll = () => {
    const doc = document.documentElement;
    const total = doc.scrollHeight - window.innerHeight;
    const pct = total > 0 ? Math.min(100, Math.round(window.scrollY / total * 100)) : 100;
    bar.style.width = pct + '%';
    thresholds.forEach(t => {
      if (pct >= t && !fired.has(t)) {
        fired.add(t);
        pushEvent({ name: 'scroll_depth', props: { depth: t } });
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Lightweight global event layer and Plausible integration
window.eventLayer = window.eventLayer || { events: [], push(obj) { this.events.push(obj); console.log('eventLayer push', obj); } };
function pushEvent(ev) {
  try {
    // keep structure small and non-identifying
    const payload = { name: ev.name, props: ev.props || {}, ts: Date.now() };
    window.eventLayer.push(payload);
  } catch (e) { console.warn(e); }
}

function captureOutboundLinks() {
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a');
    if (!a || !a.href) return;
    try {
      const url = new URL(a.href, location.href);
      if (url.hostname !== location.hostname) {
        pushEvent({ name: 'outbound_link_click', props: { href: a.href } });
      }
    } catch (err) { /* ignore */ }
  });
}

// Plausible removed: site uses lightweight `eventLayer` only.

// Initialize all enhancements
try {
  enhanceMetadata();
  computeReadTime();
  initProgressAndScrollDepth();
  captureOutboundLinks();
  pushEvent({ name: 'page_view', props: { path: location.pathname } });
} catch (e) { console.warn(e); }
