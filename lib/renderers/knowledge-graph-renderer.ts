import type { KnowledgeGraphData } from "@/lib/agents/knowledge-graph-generator";

export type KnowledgeGraphLayout = "tree_lr";
export type KnowledgeGraphTheme = "mono";

export interface KnowledgeGraphRenderOptions {
  layout?: KnowledgeGraphLayout;
  theme?: KnowledgeGraphTheme;
}

export const KNOWLEDGE_GRAPH_RENDERER_VERSION = "1.0.1";

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

export function renderKnowledgeGraphHtml(
  data: KnowledgeGraphData,
  opts: KnowledgeGraphRenderOptions = {},
): string {
  const layout = opts.layout ?? "tree_lr";
  const theme = opts.theme ?? "mono";

  if (layout !== "tree_lr") {
    throw new Error(`Unsupported knowledge graph layout: ${layout}`);
  }
  if (theme !== "mono") {
    throw new Error(`Unsupported knowledge graph theme: ${theme}`);
  }

  // Minimal UI, but nodes get colored category accents.
  const CATEGORY_COLORS = [
    "#3b82f6", // blue
    "#06b6d4", // cyan
    "#14b8a6", // teal
    "#22c55e", // green
    "#84cc16", // lime
    "#eab308", // yellow
    "#f97316", // orange
    "#ef4444", // red
    "#f43f5e", // rose
    "#ec4899", // pink
    "#6366f1", // indigo
    "#a855f7", // purple (fallback for many categories)
  ];

  const categories = [...new Set(data.nodes.map((n) => n.category))];
  const categoryColorMap: Record<string, string> = {};
  categories.forEach((cat, i) => {
    categoryColorMap[cat] = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  });

  const nodesJson = JSON.stringify(data.nodes);
  const edgesJson = JSON.stringify(data.edges);
  const categoryMapJson = JSON.stringify(categoryColorMap);

  const safeTitle = escapeHtml(data.title);
  const safeSummary = escapeHtml(data.summary);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle} — Knowledge Graph</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #050507;
    color: #f5f5f5;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  #header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px 8px 18px;
    background: linear-gradient(180deg, rgba(5,5,7,0.95) 0%, rgba(5,5,7,0) 100%);
    pointer-events: none;
  }
  #header > * { pointer-events: auto; }
  #header h1 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #ffffff;
    line-height: 1.1;
  }
  #header p {
    font-size: 12px;
    color: rgba(245,245,245,0.68);
    margin-top: 4px;
    max-width: min(64vw, 820px);
    line-height: 1.35;
  }

  .right-rail {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    min-width: 240px;
    max-width: 46vw;
  }

  .legend {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    max-width: 46vw;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: rgba(245,245,245,0.68);
    padding: 2px 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.22);
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .search {
    width: min(360px, 46vw);
    position: relative;
  }
  .search input {
    width: 100%;
    background: rgba(0, 0, 0, 0.55);
    color: rgba(255,255,255,0.92);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .search input:focus {
    border-color: rgba(255,255,255,0.22);
    background: rgba(0, 0, 0, 0.72);
  }
  .search-results {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.86);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 14px 38px rgba(0,0,0,0.45);
  }
  .search-results button {
    width: 100%;
    background: transparent;
    border: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    cursor: pointer;
    color: rgba(255,255,255,0.9);
    font-size: 12px;
  }
  .search-results button:hover {
    background: rgba(255,255,255,0.06);
  }
  .search-results .muted {
    color: rgba(245,245,245,0.55);
    font-size: 11px;
    flex: 0 0 auto;
  }

  #stage {
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  svg {
    display: block;
    cursor: grab;
    width: 100%;
    height: 100%;
  }
  svg:active { cursor: grabbing; }

  #tooltip {
    position: fixed;
    display: none;
    background: rgba(0, 0, 0, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 14px 18px;
    max-width: 340px;
    backdrop-filter: blur(20px);
    z-index: 200;
    pointer-events: none;
    box-shadow: 0 10px 34px rgba(0,0,0,0.5);
  }
  #tooltip .tt-label {
    font-size: 14px;
    font-weight: 700;
    color: rgba(255,255,255,0.95);
    margin-bottom: 4px;
  }
  #tooltip .tt-cat {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
    opacity: 0.85;
  }
  #tooltip .tt-desc {
    font-size: 12px;
    color: rgba(245,245,245,0.78);
    line-height: 1.5;
  }

  #controls {
    position: fixed;
    bottom: 18px;
    left: 18px;
    display: flex;
    gap: 8px;
    z-index: 100;
    flex-wrap: wrap;
    max-width: calc(100vw - 36px);
  }
  .ctrl-btn {
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: rgba(245,245,245,0.78);
    padding: 8px 12px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.18s ease;
  }
  .ctrl-btn:hover {
    background: rgba(0, 0, 0, 0.78);
    color: rgba(255,255,255,0.95);
    border-color: rgba(255, 255, 255, 0.26);
    transform: translateY(-1px);
  }
  .ctrl-btn:active { transform: translateY(0); }

  #stats {
    position: fixed;
    bottom: 18px;
    right: 18px;
    font-size: 11px;
    color: rgba(245,245,245,0.55);
    z-index: 100;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 8px 10px;
    backdrop-filter: blur(10px);
  }

  /* SVG styling */
  .link {
    fill: none;
    stroke: rgba(255, 255, 255, 0.16);
    stroke-width: 1.25;
  }
  .link--active {
    stroke: rgba(255, 255, 255, 0.42);
    stroke-width: 1.75;
  }
  .node {
    cursor: pointer;
  }
  .node__box {
    fill: rgba(0, 0, 0, 0.86);
    stroke: rgba(255, 255, 255, 0.14);
    stroke-width: 1;
    rx: 10;
    ry: 10;
    filter: drop-shadow(0 10px 24px rgba(0,0,0,0.28));
  }
  .node__box--hover {
    stroke: rgba(255, 255, 255, 0.38);
  }
  .node__accent {
    opacity: 0.95;
  }
  .node__label {
    font-size: 13px;
    font-weight: 700;
    fill: rgba(255, 255, 255, 0.95);
    dominant-baseline: middle;
  }
  .node__meta {
    font-size: 11px;
    font-weight: 700;
    fill: rgba(245, 245, 245, 0.62);
    dominant-baseline: middle;
  }
</style>
</head>
<body>

<div id="header">
  <div>
    <h1>${safeTitle}</h1>
    <p>${safeSummary}</p>
  </div>
  <div class="right-rail">
    <div class="search">
      <input id="search" placeholder="Search nodes… (e.g. “overfitting”)" autocomplete="off" />
      <div class="search-results" id="searchResults"></div>
    </div>
    <div class="legend" id="legend"></div>
  </div>
</div>

<div id="stage">
  <svg id="graph" aria-label="Knowledge graph tree"></svg>
</div>

<div id="tooltip">
  <div class="tt-label"></div>
  <div class="tt-cat"></div>
  <div class="tt-desc"></div>
</div>

<div id="controls">
  <button class="ctrl-btn" onclick="fitToView()">Fit</button>
  <button class="ctrl-btn" onclick="resetView()">Reset</button>
  <button class="ctrl-btn" onclick="collapseAll()">Collapse all</button>
  <button class="ctrl-btn" onclick="expandAll()">Expand all</button>
</div>

<div id="stats"></div>

<script>
const nodes = ${nodesJson};
const edges = ${edgesJson};
const categoryColors = ${categoryMapJson};

const svg = document.getElementById('graph');
const tooltip = document.getElementById('tooltip');
const statsEl = document.getElementById('stats');
const legendEl = document.getElementById('legend');
const searchInput = document.getElementById('search');
const searchResultsEl = document.getElementById('searchResults');

let W, H;
let hoveredId = null;
let focusedId = null;

// Camera (world coordinates)
let cam = { x: 0, y: 0, zoom: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let camStart = { x: 0, y: 0 };

// Legend
const cats = [...new Set(nodes.map(n => n.category))];
cats.forEach(cat => {
  const item = document.createElement('div');
  item.className = 'legend-item';
  const dot = document.createElement('div');
  dot.className = 'legend-dot';
  dot.style.background = (categoryColors[cat] || '#3b82f6');
  const text = document.createElement('span');
  text.textContent = cat;
  item.appendChild(dot);
  item.appendChild(text);
  legendEl.appendChild(item);
});

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  render();
});

// Build a rooted tree from graph data (max spanning tree from the most important node)
const nodeById = {};
for (const n of nodes) {
  nodeById[n.id] = {
    ...n,
    color: categoryColors[n.category] || '#3b82f6',
    children: [],
    parentId: null,
    edgeToParent: null,
    collapsed: false,
    depth: 0,
    x: 0,
    y: 0,
    w: 180,
    h: 44,
  };
}

function hexToRgb(hex) {
  const h = (hex || '').trim();
  if (!h.startsWith('#')) return null;
  const raw = h.slice(1);
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
}

function hexToRgba(hex, a) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(255,255,255,' + a + ')';
  return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
}

const adj = {};
for (const n of nodes) adj[n.id] = [];
for (const e of edges) {
  if (!nodeById[e.source] || !nodeById[e.target]) continue;
  adj[e.source].push({ to: e.target, label: e.label, strength: e.strength });
  adj[e.target].push({ to: e.source, label: e.label, strength: e.strength });
}

let rootId = nodes[0]?.id;
for (const n of nodes) {
  if (!rootId || n.importance > nodeById[rootId].importance) rootId = n.id;
}

function initialCollapseDepthForCount(n) {
  if (n > 90) return 1;
  if (n > 45) return 2;
  return 3;
}

function buildTree() {
  for (const id in nodeById) {
    nodeById[id].children = [];
    nodeById[id].parentId = null;
    nodeById[id].edgeToParent = null;
  }

  const visited = new Set();
  visited.add(rootId);
  const candidates = [];

  const pushEdges = (fromId) => {
    for (const e of (adj[fromId] || [])) {
      candidates.push({ from: fromId, to: e.to, label: e.label, strength: e.strength });
    }
  };
  pushEdges(rootId);

  while (visited.size < nodes.length && candidates.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (visited.has(c.to)) continue;
      const imp = nodeById[c.to]?.importance ?? 0;
      const score = (c.strength || 1) * 100 + imp;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const picked = candidates.splice(bestIdx, 1)[0];
    if (!picked || visited.has(picked.to)) continue;
    const child = nodeById[picked.to];
    child.parentId = picked.from;
    child.edgeToParent = { label: picked.label, strength: picked.strength };
    visited.add(picked.to);
    pushEdges(picked.to);
  }

  // Attach any disconnected nodes to root to keep a single navigable tree
  for (const n of nodes) {
    if (n.id === rootId) continue;
    const node = nodeById[n.id];
    if (!node.parentId) {
      node.parentId = rootId;
      node.edgeToParent = { label: "related", strength: 1 };
    }
  }

  for (const n of nodes) {
    if (n.id === rootId) continue;
    const node = nodeById[n.id];
    const parent = nodeById[node.parentId];
    if (parent) parent.children.push(node);
  }

  const sortChildren = (node) => {
    node.children.sort((a, b) => (b.importance - a.importance) || a.label.localeCompare(b.label));
    node.children.forEach(sortChildren);
  };
  sortChildren(nodeById[rootId]);

  // default: keep it readable by collapsing deeper levels based on size
  const initialCollapseDepth = initialCollapseDepthForCount(nodes.length);
  const setDepthAndCollapse = (node, depth) => {
    node.depth = depth;
    node.collapsed = depth >= initialCollapseDepth && node.children.length > 0;
    for (const ch of node.children) setDepthAndCollapse(ch, depth + 1);
  };
  setDepthAndCollapse(nodeById[rootId], 0);
}

// Node sizing (for label fitting)
const measureCanvas = document.createElement('canvas');
const mctx = measureCanvas.getContext('2d');
function measureLabelWidth(text) {
  if (!mctx) return 160;
  mctx.font = '700 13px Inter, -apple-system, sans-serif';
  return mctx.measureText(text).width;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function truncateToPx(text, maxPx) {
  if (!mctx) return text;
  if (measureLabelWidth(text) <= maxPx) return text;
  const ell = '…';
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid) + ell;
    if (measureLabelWidth(candidate) <= maxPx) lo = mid + 1;
    else hi = mid;
  }
  return text.slice(0, Math.max(1, lo - 1)) + ell;
}

function visibleChildren(node) {
  if (node.collapsed) return [];
  return node.children;
}

function computeLayout() {
  const root = nodeById[rootId];
  // precompute widths based on "[Label]"
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    const label = '[' + n.label + ']';
    const w = measureLabelWidth(label);
    n.w = clamp(w + 42, 140, 300);
    n.h = 44;
    for (const ch of visibleChildren(n)) stack.push(ch);
  }

  const levelGap = 320;
  const vGap = 16;
  let cursorY = 0;

  function postOrderY(node) {
    const kids = visibleChildren(node);
    if (!kids.length) {
      node.y = cursorY;
      cursorY += node.h + vGap;
      return node.y;
    }
    for (const ch of kids) postOrderY(ch);
    node.y = (kids[0].y + kids[kids.length - 1].y) / 2;
    return node.y;
  }
  postOrderY(root);

  function preOrderX(node, depth) {
    node.depth = depth;
    node.x = depth * levelGap;
    for (const ch of visibleChildren(node)) preOrderX(ch, depth + 1);
  }
  preOrderX(root, 0);
}

function collectVisible() {
  const root = nodeById[rootId];
  const list = [];
  const links = [];
  const walk = (node) => {
    list.push(node);
    const kids = visibleChildren(node);
    for (const ch of kids) {
      links.push({ from: node, to: ch, label: ch.edgeToParent?.label || "" });
      walk(ch);
    }
  };
  walk(root);
  return { list, links };
}

function bboxFor(nodesList) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodesList) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  if (!isFinite(minX)) minX = minY = maxX = maxY = 0;
  return { minX, minY, maxX, maxY };
}

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag) { return document.createElementNS(NS, tag); }

let viewportG = null;

function applyCam() {
  if (!viewportG) return;
  viewportG.setAttribute(
    'transform',
    'translate(' + (W / 2) + ',' + (H / 2) + ') scale(' + cam.zoom + ') translate(' + (-cam.x) + ',' + (-cam.y) + ')'
  );
}

function worldFromScreen(sx, sy) {
  return {
    x: (sx - W / 2) / cam.zoom + cam.x,
    y: (sy - H / 2) / cam.zoom + cam.y,
  };
}

function fitToView() {
  const { list } = collectVisible();
  const bb = bboxFor(list);
  const margin = 80;
  const contentW = Math.max(1, bb.maxX - bb.minX);
  const contentH = Math.max(1, bb.maxY - bb.minY);
  const z = Math.min(
    1.35,
    (W - margin * 2) / contentW,
    (H - margin * 2) / contentH
  );
  cam.zoom = clamp(z, 0.2, 2.2);
  cam.x = (bb.minX + bb.maxX) / 2;
  cam.y = (bb.minY + bb.maxY) / 2;
  applyCam();
}

function resetView() {
  cam = { x: 0, y: 0, zoom: 1 };
  fitToView();
}

function setAllCollapsed(value) {
  const root = nodeById[rootId];
  const walk = (node, depth) => {
    if (node.children.length) node.collapsed = value && depth > 0;
    for (const ch of node.children) walk(ch, depth + 1);
  };
  walk(root, 0);
}

function collapseAll() {
  setAllCollapsed(true);
  render();
  fitToView();
}

function expandAll() {
  setAllCollapsed(false);
  render();
  fitToView();
}

function updateStats() {
  const visible = collectVisible().list.length;
  statsEl.textContent = visible + ' / ' + nodes.length + ' nodes visible · ' + edges.length + ' relationships';
}

function applyHoverStyles() {
  if (!viewportG) return;
  const activeId = hoveredId || focusedId;

  const links = viewportG.querySelectorAll('path.link');
  for (const p of links) {
    const from = p.getAttribute('data-from');
    const to = p.getAttribute('data-to');
    p.classList.toggle('link--active', !!activeId && (from === activeId || to === activeId));
  }

  const nodesEls = viewportG.querySelectorAll('g.node');
  for (const g of nodesEls) {
    const id = g.getAttribute('data-id');
    const rect = g.querySelector('rect.node__box');
    if (!rect) continue;
    const isActive = !!activeId && id === activeId;
    rect.classList.toggle('node__box--hover', isActive);
    const c = id && nodeById[id] ? nodeById[id].color : '#ffffff';
    rect.setAttribute('stroke', isActive ? hexToRgba(c, 0.55) : 'rgba(255,255,255,0.14)');
  }
}

function render() {
  computeLayout();
  const { list, links } = collectVisible();
  updateStats();

  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  viewportG = svgEl('g');
  svg.appendChild(viewportG);
  applyCam();

  // Links
  for (const l of links) {
    const p = svgEl('path');
    const sx = l.from.x + l.from.w;
    const sy = l.from.y + l.from.h / 2;
    const ex = l.to.x;
    const ey = l.to.y + l.to.h / 2;
    const midx = (sx + ex) / 2;
    const d = 'M ' + sx + ' ' + sy + ' C ' + midx + ' ' + sy + ', ' + midx + ' ' + ey + ', ' + ex + ' ' + ey;
    p.setAttribute('d', d);
    p.setAttribute('class', 'link');
    p.setAttribute('data-from', l.from.id);
    p.setAttribute('data-to', l.to.id);
    viewportG.appendChild(p);
  }

  // Nodes
  for (const n of list) {
    const g = svgEl('g');
    g.setAttribute('class', 'node');
    g.setAttribute('data-id', n.id);
    g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');

    const box = svgEl('rect');
    box.setAttribute('class', 'node__box');
    box.setAttribute('width', n.w);
    box.setAttribute('height', n.h);
    box.setAttribute('fill', hexToRgba(n.color, 0.10));
    box.setAttribute('stroke', 'rgba(255,255,255,0.14)');
    g.appendChild(box);

    const accent = svgEl('rect');
    accent.setAttribute('class', 'node__accent');
    accent.setAttribute('x', 0);
    accent.setAttribute('y', 0);
    accent.setAttribute('width', 6);
    accent.setAttribute('height', n.h);
    accent.setAttribute('rx', 10);
    accent.setAttribute('ry', 10);
    accent.setAttribute('fill', n.color);
    g.appendChild(accent);

    const label = svgEl('text');
    label.setAttribute('class', 'node__label');
    label.setAttribute('x', 14);
    label.setAttribute('y', n.h / 2);
    const full = '[' + n.label + ']';
    label.textContent = truncateToPx(full, n.w - 40);
    g.appendChild(label);

    if (n.children.length) {
      const meta = svgEl('text');
      meta.setAttribute('class', 'node__meta');
      meta.setAttribute('x', n.w - 12);
      meta.setAttribute('y', n.h / 2);
      meta.setAttribute('text-anchor', 'end');
      const hiddenCount = n.collapsed ? n.children.length : 0;
      meta.textContent = n.collapsed ? ('+' + hiddenCount) : '–';
      g.appendChild(meta);
    }

    g.addEventListener('mouseenter', (e) => {
      hoveredId = n.id;
      showTooltip(n, e.clientX, e.clientY);
      applyHoverStyles();
    });
    g.addEventListener('mousemove', (e) => {
      showTooltip(n, e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', () => {
      hoveredId = null;
      tooltip.style.display = 'none';
      applyHoverStyles();
    });
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!n.children.length) return;
      n.collapsed = !n.collapsed;
      focusedId = null;
      render();
    });

    viewportG.appendChild(g);
  }

  applyHoverStyles();
}

function showTooltip(node, clientX, clientY) {
  tooltip.style.display = 'block';
  tooltip.querySelector('.tt-label').textContent = node.label;
  tooltip.querySelector('.tt-cat').textContent = node.category;
  tooltip.querySelector('.tt-cat').style.color = node.color;
  tooltip.querySelector('.tt-desc').textContent = node.description;

  let tx = clientX + 14;
  let ty = clientY + 14;
  if (tx + 340 > W) tx = clientX - 354;
  if (ty + 160 > H) ty = clientY - 160;
  tooltip.style.left = tx + 'px';
  tooltip.style.top = ty + 'px';
}

function expandAncestors(nodeId) {
  let cur = nodeById[nodeId];
  while (cur && cur.parentId) {
    const parent = nodeById[cur.parentId];
    if (!parent) break;
    parent.collapsed = false;
    cur = parent;
  }
}

function focusNode(nodeId) {
  if (!nodeById[nodeId]) return;
  focusedId = nodeId;
  expandAncestors(nodeId);
  render();

  const n = nodeById[nodeId];
  cam.x = n.x + n.w / 2;
  cam.y = n.y + n.h / 2;
  cam.zoom = clamp(Math.max(cam.zoom, 1.15), 0.2, 2.8);
  applyCam();
  applyHoverStyles();
}

// Search (for scaling)
const searchIndex = nodes.map((n) => ({
  id: n.id,
  label: n.label || '',
  category: n.category || '',
  norm: (n.label || '').toLowerCase(),
}));

function setSearchResults(visible, results) {
  searchResultsEl.style.display = visible ? 'block' : 'none';
  searchResultsEl.innerHTML = '';
  if (!visible) return;
  for (const r of results) {
    const btn = document.createElement('button');
    const left = document.createElement('span');
    left.textContent = r.label;
    const right = document.createElement('span');
    right.className = 'muted';
    right.textContent = r.category;
    btn.appendChild(left);
    btn.appendChild(right);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      searchInput.value = '';
      setSearchResults(false, []);
      tooltip.style.display = 'none';
      focusNode(r.id);
    });
    searchResultsEl.appendChild(btn);
  }
}

searchInput.addEventListener('input', () => {
  const q = (searchInput.value || '').trim().toLowerCase();
  if (!q) return setSearchResults(false, []);
  const matches = [];
  for (const item of searchIndex) {
    if (!item.norm) continue;
    const idx = item.norm.indexOf(q);
    if (idx === -1) continue;
    const score = idx * 10 + item.norm.length;
    matches.push({ ...item, score });
  }
  matches.sort((a, b) => a.score - b.score);
  setSearchResults(true, matches.slice(0, 8));
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    setSearchResults(false, []);
    searchInput.blur();
  }
});

document.addEventListener('click', (e) => {
  if (e.target === searchInput || searchResultsEl.contains(e.target)) return;
  setSearchResults(false, []);
});

// Pan/zoom
svg.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (e.target && e.target.closest && e.target.closest('.node')) return;
  focusedId = null;
  isPanning = true;
  panStart = { x: e.clientX, y: e.clientY };
  camStart = { x: cam.x, y: cam.y };
});

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  cam.x = camStart.x - (e.clientX - panStart.x) / cam.zoom;
  cam.y = camStart.y - (e.clientY - panStart.y) / cam.zoom;
  applyCam();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
});

svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.92 : 1.08;
  const before = worldFromScreen(e.clientX, e.clientY);
  cam.zoom = clamp(cam.zoom * factor, 0.2, 2.8);
  const after = worldFromScreen(e.clientX, e.clientY);
  cam.x += (before.x - after.x);
  cam.y += (before.y - after.y);
  applyCam();
}, { passive: false });

svg.addEventListener('click', () => {
  tooltip.style.display = 'none';
});

buildTree();
render();
fitToView();
</script>
</body>
</html>`;
}
