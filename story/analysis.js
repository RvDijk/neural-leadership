// Lightweight graph analysis utilities for the Graph Notebook
// Exports: findBottleneckNodes, detectHighLatencyPaths, detectConflictLoops, compareOrgStates, detectAll

function buildAdj(graph, directed = true) {
  const adj = new Map();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    if (!adj.has(e.a) || !adj.has(e.b)) return;
    adj.get(e.a).push({ to: e.b, edge: e });
    if (!directed) adj.get(e.b).push({ to: e.a, edge: e });
  });
  return adj;
}

// Brandes algorithm for betweenness centrality
function brandes(graph, directed = true) {
  const ids = graph.nodes.map(n => n.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const adj = buildAdj(graph, directed);
  const CB = Object.fromEntries(ids.map(id => [id, 0]));

  for (const s of ids) {
    const S = [];
    const P = {};
    const sigma = Object.fromEntries(ids.map(id => [id, 0]));
    const dist = Object.fromEntries(ids.map(id => [id, -1]));
    sigma[s] = 1; dist[s] = 0;
    const Q = [s];
    while (Q.length) {
      const v = Q.shift();
      S.push(v);
      const neighbors = adj.get(v) || [];
      for (const nb of neighbors) {
        const w = nb.to;
        if (dist[w] < 0) { dist[w] = dist[v] + 1; Q.push(w); }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v];
          (P[w] = P[w] || []).push(v);
        }
      }
    }
    const delta = Object.fromEntries(ids.map(id => [id, 0]));
    while (S.length) {
      const w = S.pop();
      const prs = P[w] || [];
      for (const v of prs) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) CB[w] += delta[w];
    }
  }
  // optional normalization omitted — caller can interpret raw scores
  return CB;
}

function findBottleneckNodes(graph, opts = {}) {
  const { top = 5, directed = true } = opts;
  const centrality = brandes(graph, directed);
  // count adjacent high-load edges
  const highLoadAdj = {};
  graph.nodes.forEach(n => highLoadAdj[n.id] = 0);
  graph.edges.forEach(e => {
    if (e.load === 'high') {
      if (highLoadAdj[e.a] !== undefined) highLoadAdj[e.a]++;
      if (highLoadAdj[e.b] !== undefined) highLoadAdj[e.b]++;
    }
  });
  const rows = graph.nodes.map(n => ({ id: n.id, centrality: centrality[n.id] || 0, highLoadAdj: highLoadAdj[n.id] || 0, type: n.type }));
  rows.sort((a,b) => (b.centrality - a.centrality) || (b.highLoadAdj - a.highLoadAdj));
  return rows.slice(0, top);
}

// Dijkstra for latency-weighted shortest paths; edge weight preference: latency -> load mapping -> 1
function dijkstraShortestPaths(graph, source) {
  const nodes = graph.nodes.map(n => n.id);
  const dist = Object.fromEntries(nodes.map(n => [n, Infinity]));
  const prev = Object.fromEntries(nodes.map(n => [n, null]));
  dist[source] = 0;
  const q = new Set(nodes);
  const edgesFrom = new Map();
  graph.edges.forEach(e => { if (!edgesFrom.has(e.a)) edgesFrom.set(e.a, []); edgesFrom.get(e.a).push(e); });

  while (q.size) {
    let u = null, best = Infinity;
    for (const v of q) if (dist[v] < best) { best = dist[v]; u = v; }
    if (u === null) break;
    q.delete(u);
    const outs = edgesFrom.get(u) || [];
    for (const e of outs) {
      const v = e.b;
      if (!q.has(v)) continue;
      const w = ('latency' in e) ? Number(e.latency) : (e.load === 'high' ? 10 : 1);
      const alt = dist[u] + w;
      if (alt < dist[v]) { dist[v] = alt; prev[v] = { from: u, edge: e }; }
    }
  }
  return { dist, prev };
}

function reconstructPath(prev, target) {
  const path = [];
  let cur = target;
  while (prev[cur]) { path.unshift(prev[cur].edge); cur = prev[cur].from; }
  return path;
}

function detectHighLatencyPaths(graph, opts = {}) {
  const { top = 5 } = opts;
  const nodes = graph.nodes.map(n => n.id);
  const results = [];
  for (const s of nodes) {
    const { dist, prev } = dijkstraShortestPaths(graph, s);
    for (const t of nodes) {
      if (s === t) continue;
      const d = dist[t];
      if (!isFinite(d)) continue;
      const path = reconstructPath(prev, t);
      results.push({ from: s, to: t, distance: d, path });
    }
  }
  results.sort((a,b) => b.distance - a.distance);
  return results.slice(0, top);
}

// Detect directed cycles; simple DFS backtrack to extract cycles
function detectConflictLoops(graph, opts = {}) {
  const directed = opts.directed !== false;
  const adj = buildAdj(graph, directed);
  const color = Object.fromEntries(graph.nodes.map(n => [n.id, 0]));
  const stack = [];
  const cycles = [];

  function dfs(u) {
    color[u] = 1; stack.push(u);
    for (const nb of (adj.get(u) || [])) {
      const v = nb.to;
      if (color[v] === 0) dfs(v);
      else if (color[v] === 1) {
        // found a back-edge; extract cycle
        const idx = stack.lastIndexOf(v);
        if (idx >= 0) {
          const cycleNodes = stack.slice(idx);
          cycles.push(cycleNodes.slice());
        }
      }
    }
    stack.pop(); color[u] = 2;
  }

  for (const n of graph.nodes.map(n => n.id)) if (color[n] === 0) dfs(n);

  // score cycles by mean alignment (lower = more conflict)
  const edgeMap = new Map(graph.edges.map(e => [`${e.a}->${e.b}`, e]));
  const scored = cycles.map(cycle => {
    const edges = [];
    for (let i = 0; i < cycle.length; i++) {
      const a = cycle[i]; const b = cycle[(i+1) % cycle.length];
      const e = edgeMap.get(`${a}->${b}`) || edgeMap.get(`${b}->${a}`);
      edges.push(e);
    }
    const aligns = edges.filter(Boolean).map(e => ('align' in e) ? e.align : 1);
    const meanAlign = aligns.length ? (aligns.reduce((s,x)=>s+x,0)/aligns.length) : 1;
    return { nodes: cycle, meanAlign, edges };
  });
  return scored.filter(s => s.meanAlign < (opts.threshold || 0.6));
}

function compareOrgStates(a, b) {
  const na = new Set(a.nodes.map(n => n.id));
  const nb = new Set(b.nodes.map(n => n.id));
  const added = [...nb].filter(x => !na.has(x));
  const removed = [...na].filter(x => !nb.has(x));
  const common = [...na].filter(x => nb.has(x));
  const nodeChanges = common.map(id => {
    const naNode = a.nodes.find(n=>n.id===id);
    const nbNode = b.nodes.find(n=>n.id===id);
    const diffs = {};
    for (const k of Object.keys(Object.assign({}, naNode, nbNode))) {
      if (JSON.stringify(naNode[k]) !== JSON.stringify(nbNode[k])) diffs[k] = { from: naNode[k], to: nbNode[k] };
    }
    return { id, diffs };
  }).filter(x => Object.keys(x.diffs).length);

  function edgeKey(e){ return `${e.a}|${e.b}|${e.type||''}`; }
  const ea = new Map(a.edges.map(e=>[edgeKey(e), e]));
  const eb = new Map(b.edges.map(e=>[edgeKey(e), e]));
  const addedEdges = [...eb.keys()].filter(k=>!ea.has(k)).map(k=>eb.get(k));
  const removedEdges = [...ea.keys()].filter(k=>!eb.has(k)).map(k=>ea.get(k));
  const changedEdges = [...ea.keys()].filter(k=>eb.has(k)).map(k=>{
    const aE = ea.get(k), bE = eb.get(k);
    if (JSON.stringify(aE) !== JSON.stringify(bE)) return { key: k, from: aE, to: bE };
    return null;
  }).filter(Boolean);

  return { addedNodes: added, removedNodes: removed, nodeChanges, addedEdges, removedEdges, changedEdges };
}

function detectAll(graph) {
  return {
    bottlenecks: findBottleneckNodes(graph, { top: 6 }),
    latPaths: detectHighLatencyPaths(graph, { top: 6 }),
    conflictLoops: detectConflictLoops(graph, { threshold: 0.6 }),
  };
}

export { findBottleneckNodes, detectHighLatencyPaths, detectConflictLoops, compareOrgStates, detectAll };
