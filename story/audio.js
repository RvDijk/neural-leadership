/* ──────────────────────────────────────────────────────────────────
   audio.js — Web Audio API tone generator for subtle signal cues.
   Off by default. Toggled via the sound button.
   ────────────────────────────────────────────────────────────────── */

let ctx = null;
let masterGain = null;
let enabled = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function setAudioEnabled(on) {
  enabled = on;
  if (on) {
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
  }
}

export function isAudioEnabled() { return enabled; }

/* FM-style soft tone with envelope */
function tone({ freq = 440, mod = 0, modIdx = 0, dur = 0.4, attack = 0.005, type = 'sine', gain = 1 } = {}) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const carrier = c.createOscillator();
  carrier.type = type;
  carrier.frequency.value = freq;

  // FM
  if (mod > 0) {
    const modOsc = c.createOscillator();
    const modGain = c.createGain();
    modOsc.frequency.value = mod;
    modGain.gain.value = modIdx;
    modOsc.connect(modGain).connect(carrier.frequency);
    modOsc.start(now);
    modOsc.stop(now + dur);
  }

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  carrier.connect(g).connect(masterGain);
  carrier.start(now);
  carrier.stop(now + dur);
}

/* Public sound effects ───────────────────────────────────────────── */
export const sfx = {
  fire()      { tone({ freq: 520, mod: 110, modIdx: 90,  dur: .35, type: 'triangle', gain: .8 }); },
  arrive()    { tone({ freq: 220, mod: 55,  modIdx: 30,  dur: .55, type: 'sine',     gain: .6 }); },
  scar()      { tone({ freq: 140, mod: 73,  modIdx: 60,  dur: .8,  type: 'sawtooth', gain: .35 }); },
  reinforce() { tone({ freq: 660, mod: 220, modIdx: 60,  dur: .4,  type: 'sine',     gain: .55 }); },
  threshold() { tone({ freq: 880, mod: 0,            dur: .25, type: 'square',   gain: .35 }); },
  click()     { tone({ freq: 1200, mod: 0,           dur: .08, type: 'sine',     gain: .25 }); },
  perturb()   { tone({ freq: 320, mod: 80, modIdx: 100, dur: .5,  type: 'triangle', gain: .55 }); },
};
