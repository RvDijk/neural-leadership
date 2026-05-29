import { el, onceVisible } from '../lib.js';

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
    setTimeout(() => pre.classList.add('fired'), preDelay);
    setTimeout(() => post.classList.add('fired'), postDelay);
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
  onceVisible(host, () => demo(20), 0.5);
}

export default buildSTDP;
