/* ──────────────────────────────────────────────────────────────────
   story.js — Thin boot. Wires citations, TOC, static-DOM handlers,
   lazy-loads per-scene modules from ./scenes/.
   Scene implementations live in ./scenes/<name>.js
   Shared helpers (el, clamp, onceVisible, rng, lazyBuild) live in ./lib.js
   ────────────────────────────────────────────────────────────────── */

import { clamp, onceVisible, lazyBuild } from './lib.js';

/* ────────────── Register Houdini paint worklet ────────────── */
if ('paintWorklet' in CSS) {
  CSS.paintWorklet.addModule('emergence-worklet.js').catch(() => { /* ignore */ });
}

/* ────────────── Service worker (offline + fast repeat-visit) ────────────── */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* ignore */ });
  });
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
  eurich2017:  'Eurich (2017). Insight. — 95% believe they’re self-aware; 10–15% are.',
  granovetter1973:  'Granovetter (1973). The Strength of Weak Ties. Weak connections span different information worlds; strong ties cluster in the same one.',
  barabasi1999:     'Barabasi & Albert (1999). Emergence of scaling in random networks. Preferential attachment: new nodes connect proportional to existing degree — hubs form inevitably unless actively countered.',
  eigenvalue:  'Eigenvector centrality: your influence score is proportional to the influence scores of your neighbors. A star-topology leader pools this score at one node — remove that node and the score collapses. A leader who co-develops others distributes centrality across the mesh. The network’s resilience is proportional to how well the eigenvalue is spread.',
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
    const src = CITES[c.dataset.cite] || '';
    c.setAttribute('role', 'button');
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-label', `Citation: ${src} — activate to jump to bibliography entry.`);
    c.setAttribute('aria-describedby', 'cite-tooltip');
    c.addEventListener('mouseenter', e => show(c.dataset.cite, e.clientX, e.clientY));
    c.addEventListener('mousemove',  e => show(c.dataset.cite, e.clientX, e.clientY));
    c.addEventListener('mouseleave', () => { tip.hidden = true; });
    c.addEventListener('focus', () => {
      const r = c.getBoundingClientRect();
      show(c.dataset.cite, r.left, r.bottom);
    });
    c.addEventListener('blur', () => { tip.hidden = true; });
    const jump = () => {
      const target = document.getElementById('ref-' + c.dataset.cite);
      if (!target) return;
      const details = target.closest('details');
      if (details) details.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('highlight');
      setTimeout(() => target.classList.remove('highlight'), 3000);
    };
    c.addEventListener('click', jump);
    c.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); }
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

/* ────────────── Decay (Act IV — static SVG, click to reinforce) ────────────── */
function wireDecay() {
  const sec = document.querySelector('.scene--decay');
  if (!sec) return;
  sec.querySelectorAll('.curve').forEach(c => {
    c.style.cursor = 'pointer';
    c.addEventListener('click', () => {
      c.style.transition = 'stroke-dashoffset 0s';
      c.style.strokeDashoffset = '1';
      requestAnimationFrame(() => {
        c.style.transition = 'stroke-dashoffset 1.5s var(--ease-decay)';
        c.style.strokeDashoffset = '0';
      });
    });
  });
}

/* ────────────── Ratio scale (Act VIII — static DOM, button-driven) ────────────── */
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
    const moment = nNeg * 5 - nPos;
    const tilt = clamp(moment * 2.5, -25, 25);
    beam.style.setProperty('--scale-tilt', `${tilt}deg`);

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
      if (act === 'add-pos') nPos = Math.min(20, nPos + 1);
      if (act === 'sub-pos') nPos = Math.max(0,  nPos - 1);
      if (act === 'add-neg') nNeg = Math.min(8,  nNeg + 1);
      if (act === 'sub-neg') nNeg = Math.max(0,  nNeg - 1);
      render();
    });
  });
}

/* ────────────── Attractor (Act XI — lazy Three.js mount) ────────────── */
function wireAttractor() {
  const host = document.getElementById('attractor-stage');
  if (!host) return;
  onceVisible(host, async () => {
    const { mountAttractor } = await import('./attractor.js');
    mountAttractor(host);
  }, 0.3);
}

/* ════════════════════════════════════════════════════════════════ */
/* Boot                                                              */
/* ════════════════════════════════════════════════════════════════ */
wireCitations();
wireTOC();
wireDecay();
wireRatio();
wireAttractor();

// Each scene is a separate ESM module under ./scenes/. lazyBuild fires when
// the stage element approaches the viewport; dynamic import keeps initial
// bundle small and parse-time cheap.
const scene = (path) => () => import(path).then(m => m.default());

lazyBuild('#stdp-stage',          scene('./scenes/stdp.js'));
lazyBuild('#sum-stage',           scene('./scenes/summation.js'));
lazyBuild('#cascade-stage',       scene('./scenes/cascade.js'));
lazyBuild('#mirror-neuron-stage', scene('./scenes/mirror-neurons.js'));
lazyBuild('#refractory-stage',    scene('./scenes/refractory.js'));
lazyBuild('#cut-stage',           scene('./scenes/cut-vertex.js'));
lazyBuild('#empower-stage',       scene('./scenes/empower.js'));
lazyBuild('#futures-stage',       scene('./scenes/futures.js'));
lazyBuild('#mirror-stage',        scene('./scenes/mirror.js'));
lazyBuild('#weakties-stage',      scene('./scenes/weakties.js'));
lazyBuild('#pref-stage',          scene('./scenes/pref-attach.js'));
lazyBuild('#nodehealth-stage',    scene('./scenes/node-health.js'));
lazyBuild('#sketch-stage',        scene('./scenes/sketch.js'));

/* ────────────── Metadata, read-time, progress, analytics ────────────── */
function enhanceMetadata() {
  try {
    const title = document.querySelector('.title__inner h1')?.innerText || document.title;
    const desc = document.querySelector('meta[name="description"]').getAttribute('content');
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
    const provided = document.querySelector('meta[name="og-image"]');
    if (!provided) set('meta[property="og:image"]', '/story/banner.png');
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
  const thresholds = [25, 50, 75, 100];
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

window.eventLayer = window.eventLayer || {
  events: [],
  push(obj) { this.events.push(obj); console.log('eventLayer push', obj); },
};
function pushEvent(ev) {
  try {
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

try {
  enhanceMetadata();
  computeReadTime();
  initProgressAndScrollDepth();
  captureOutboundLinks();
  pushEvent({ name: 'page_view', props: { path: location.pathname } });
} catch (e) { console.warn(e); }
