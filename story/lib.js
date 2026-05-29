/* Shared helpers for story scenes. */

export const SVG = 'http://www.w3.org/2000/svg';

export const el = (tag, attrs = {}, parent = null) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

export const rng = (seed) => {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const onceVisible = (target, callback, threshold = 0.4) => {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (!e.isIntersecting) return; callback(e); obs.unobserve(e.target); });
  }, { threshold });
  obs.observe(target);
};

export const lazyBuild = (selector, fn) => {
  const target = document.querySelector(selector);
  if (!target) { fn(); return; }
  const obs = new IntersectionObserver((entries, o) => {
    if (entries.some(e => e.isIntersecting)) { fn(); o.disconnect(); }
  }, { rootMargin: '800px 0px 800px 0px' });
  obs.observe(target);
};
