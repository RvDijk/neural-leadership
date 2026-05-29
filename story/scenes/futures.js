import { el } from '../lib.js';

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

    const pendingEdges = [];
    peers.forEach((p, i) => {
      const roll = (i * 31 + 7) % 100 / 100;
      let stroke = '#9aa7ff', targetOpacity = .8;
      if (roll < c.okFrac) { stroke = '#7fffa3'; targetOpacity = .9; }
      else if (roll < c.okFrac + c.scarFrac) { stroke = '#ff5d7a'; targetOpacity = .8; }
      else { stroke = '#3d4564'; targetOpacity = .25; }
      const edge = el('line', {
        class: 'fut-edge', x1: center.x, y1: center.y, x2: p.x, y2: p.y, 'stroke-width': 1.5,
      }, svg);
      edge.style.stroke = stroke;
      edge.style.opacity = '0';
      pendingEdges.push({ edge, targetOpacity, delay: 60 + i * 55 });
    });
    peers.forEach((p, i) => {
      const roll = (i * 31 + 7) % 100 / 100;
      let fill = '#1a1f33', stroke = '#9aa7ff';
      if (roll < c.okFrac) { fill = '#1d3024'; stroke = '#7fffa3'; }
      else if (roll < c.okFrac + c.scarFrac) { fill = '#301d24'; stroke = '#ff5d7a'; }
      else { fill = '#1a1f33'; stroke = '#3d4564'; }
      const node = el('circle', { class: 'fut-node', cx: p.x, cy: p.y, r: 9 }, svg);
      node.style.fill = fill;
      node.style.stroke = stroke;
    });
    el('circle', { class: 'fut-node you', cx: center.x, cy: center.y, r: 14 }, svg);

    host.appendChild(svg);

    pendingEdges.forEach(({ edge, targetOpacity, delay }) => {
      setTimeout(() => {
        edge.style.transition = 'opacity 0.6s var(--ease-fire)';
        edge.style.opacity = String(targetOpacity);
      }, delay);
    });
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

export default buildFutures;
