import { el, clamp } from '../lib.js';

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
    curvePost.style.stroke = postColor;
    curvePost.style.filter = `drop-shadow(0 0 6px ${postColor})`;
    apology.style.fill = postColor;
    apology.style.filter = `drop-shadow(0 0 8px ${postColor})`;
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

export default buildRefractory;
