# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A static, no-build scroll-driven interactive story (`story/index.html`) deploying to GitHub Pages from the `story/` directory. There is no package.json, no bundler, and no test suite — all JavaScript uses native ES modules loaded directly by the browser.

## Running locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/story/
```

There is no build step. Editing any file in `story/` is immediately visible on reload.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which uploads `story/` as a GitHub Pages artifact and deploys it. The root directory is **not** published — only `story/`.

## Architecture

All source lives in `story/`:

| File | Role |
|------|------|
| `index.html` | Single-page structure with all 21 acts + final act as `<section>` elements |
| `story.js` | Thin boot module — wires citations, TOC, static-DOM handlers (Acts IV, VIII), service worker, analytics; dynamically imports per-scene modules from `./scenes/` |
| `lib.js` | Shared helpers exported as ESM: `el`, `clamp`, `rng`, `onceVisible`, `lazyBuild`, `SVG` |
| `scenes/*.js` | One ESM module per interactive scene (`stdp`, `summation`, `cascade`, `mirror-neurons`, `refractory`, `cut-vertex`, `empower`, `futures`, `mirror`, `weakties`, `pref-attach`, `node-health`, `sketch`). Each default-exports a `buildX()` function. |
| `attractor.js` | Three.js double-well potential scene for Act XI; lazy-imported via dynamic `import()` only when the section scrolls into view |
| `sw.js` | Service worker; caches core static assets for offline + fast repeat-visit |
| `emergence-worklet.js` | CSS Houdini paint worklet registered conditionally |
| `style.css` | All styling |
| `banner.png` | OG image (rendered from `banner.svg`) |
| `banner.svg` | Source SVG for `banner.png` |

### Key patterns

**Lazy loading**: `attractor.js` (Three.js, loaded from `esm.sh` CDN) is dynamically imported only when Act XI enters the viewport. All other dynamic scene builds are split into separate ESM modules under `scenes/` and are also gated behind `IntersectionObserver` via the `lazyBuild()` helper in `lib.js`, so heavy DOM construction (and the module download itself) only happens as scenes approach the viewport (800px rootMargin). Initial parse cost is `story.js` (~300 lines) + `lib.js` (~30 lines).

**Scene activation**: every interactive scene uses `IntersectionObserver` to trigger animations on scroll-into-view; most fire only once (`obs.unobserve` after first trigger).

**Analytics**: a lightweight `window.eventLayer` (local-only, no external tracker) collects page_view, scroll_depth, and interaction events. No Plausible or GA.

**View Transitions API**: used in Act XIV (Sarah's three futures) for smooth SVG network morphing; falls back gracefully when unavailable.

### SVG construction convention

All SVGs are built programmatically in `story.js` using the `el(tag, attrs, parent)` helper (creates SVG namespace elements). Static SVGs (Acts I, IV, XVI, XVII, XVIII) are authored directly in `index.html`.

## Content structure

21 acts + a Final "Field notes" act. Each act is `<section class="scene scene--<name>" id="act-N">` with two children: `.scene__copy` (text) and `.scene__stage` (visualization). Acts are linked from a floating `<nav class="toc">`.

The narrative follows Sarah and Marcus through neural/graph metaphors for leadership behaviour; citations in `[...]` syntax are wired to hover-tooltips and jump to `<footer .bibliography>`.

**Analytics**: GoatCounter script placeholder lives at the bottom of `index.html`. Replace `YOUR-SITE` with the account code after signing up at goatcounter.com. The local `window.eventLayer` continues to fire regardless.

## Expert lenses for quality work

When working on this project, adopt the relevant lens for the task. Combining multiple lenses produces the best results.

**Biological and computational neural network theory**
Hebbian plasticity, STDP (spike-timing-dependent plasticity), LTP/LTD, backpropagation, dropout regularisation, attention mechanisms and transformer architecture, emergent computation. Use this to verify that neural analogies are scientifically grounded and not accidentally inverted (e.g. STDP: pre before post strengthens; post before pre weakens — the direction matters for the story's claims).

**Social network analysis and organisational dynamics**
Granovetter (weak ties), Burt (structural holes), Jackson (network position and influence), Cross & Parker (ONA methodology), Pentland (sociometrics). Betweenness, closeness, and eigenvector centrality; cut vertices and bridges; cascade dynamics. Use this to ensure graph-theory claims map accurately to real organisational behaviour and are not over-generalised.

**Dynamic graph theory and network evolution**
Barabási-Albert preferential attachment, Watts-Strogatz small-world networks, temporal graph dynamics, network resilience and robustness. Use this to reason about how the network changes over time — currently underrepresented in the story; a fruitful area for new scenes.

**Scrollytelling and interactive data visualisation**
SVG animation, CSS scroll-driven animations (`animation-timeline: view()`), IntersectionObserver, View Transitions API, Web Audio API, CSS `@property`, Houdini paint worklets. Use this to keep visual metaphors precise: the animation should enact the concept, not merely illustrate it. Every interactive element should reward exploration.

**Narrative structure and literary craft**
Act structure, the role of a recurring character arc (Sarah/Marcus), show-don't-tell, earned emotional resonance, the difference between a reveal and an explanation. Use this to evaluate whether new scenes are genuinely illuminating or are just adding information. The site's intent is to *inspire*, not to teach a framework. A concept earns its place by changing how the reader sees something — not by being interesting in itself.

**Leadership theory and organisational behaviour**
Psychological safety (Edmondson), Lencioni's trust model, Argyris's double-loop learning, Weick's sensemaking, situational leadership. Use this to flag when content risks being read prescriptively ("do X to achieve Y") rather than observationally ("here is a dynamic you might recognise"). The site is field notes, not a playbook.

**Science communication and accessible writing**
When editing copy or writing new acts: prefer concrete specifics over abstractions, narrative before formula, a single precise claim over a cluster of related ones. Avoid hedging language that dilutes the insight ("this *might* suggest that..."). The reader should feel something clicked, not that they've been briefed.
