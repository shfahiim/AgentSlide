import { generateText } from "../gemini";
import { PipelineProgress } from "../types";

type ProgressCallback = (progress: PipelineProgress) => void;

function emit(
    onProgress: ProgressCallback | undefined,
    step: PipelineProgress["step"],
    status: PipelineProgress["status"],
    message: string,
    detail?: string,
) {
    onProgress?.({ step, status, message, detail, timestamp: Date.now() });
}

export interface KnowledgeGraphNode {
    id: string;
    label: string;
    description: string;
    category: string;
    importance: number; // 1-10, controls node size
}

export interface KnowledgeGraphEdge {
    source: string;
    target: string;
    label: string;
    strength: number; // 1-5, controls edge thickness
}

export interface KnowledgeGraphData {
    title: string;
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
    summary: string;
}

export interface KnowledgeGraphGeneratorOptions {
    userPrompt: string;
    depth?: number; // 1=shallow, 2=medium, 3=deep
    onProgress?: ProgressCallback;
}

export interface KnowledgeGraphResult {
    html: string;
    title: string;
    graphData: KnowledgeGraphData;
}

const KG_RESEARCH_PROMPT = `You are a research assistant specialized in knowledge extraction.
Analyze the given topic thoroughly and provide structured information about:
- Key concepts and entities involved
- Relationships between concepts
- Hierarchical structures
- Cause-and-effect relationships
- Categories and classifications
- Important sub-topics and related areas
Be comprehensive but factual. Include specific details.`;

const KG_GENERATION_PROMPT = `You are a knowledge graph architect. Given a topic and research notes, create a structured knowledge graph.

Output ONLY valid JSON with this exact structure:
{
  "title": "Graph title",
  "summary": "2-3 sentence summary of the knowledge domain",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Short display name",
      "description": "Brief description (1-2 sentences)",
      "category": "Category name for color coding",
      "importance": 7
    }
  ],
  "edges": [
    {
      "source": "node_id_1",
      "target": "node_id_2",
      "label": "relationship type",
      "strength": 3
    }
  ]
}

Rules:
- importance is 1-10 (10 = most central/important concept)
- strength is 1-5 (5 = strongest relationship)
- Use concise, clear labels
- Categories should be meaningful groupings (e.g., "Technology", "People", "Events")
- Ensure all edge source/target IDs exist in nodes
- Make the graph connected - avoid isolated nodes
- The central topic should have the highest importance
- No markdown, no explanation, ONLY the JSON object`;

export async function runKnowledgeGraphPipeline(
    opts: KnowledgeGraphGeneratorOptions
): Promise<KnowledgeGraphResult> {
    const { userPrompt, depth = 2, onProgress } = opts;

    const nodeCountGuide = depth === 1 ? "8-12" : depth === 2 ? "15-25" : "25-40";
    const depthDescription =
        depth === 1
            ? "Focus on the most essential concepts only. Keep it concise."
            : depth === 2
                ? "Cover main concepts and their direct relationships. Medium detail level."
                : "Go deep. Include sub-topics, secondary relationships, and nuanced connections.";

    // ─── Step 1: Research ─────────────────────────────────────
    emit(onProgress, "research", "running", "Researching topic...");
    let researchNotes = "";
    try {
        researchNotes = await generateText({
            prompt: `Research the following topic thoroughly for building a knowledge graph:\n\n${userPrompt}\n\nDepth level: ${depthDescription}\n\nProvide detailed information about key entities, concepts, relationships, hierarchies, and categorizations.`,
            systemPrompt: KG_RESEARCH_PROMPT,
            temperature: 0.3,
        });
        emit(onProgress, "research", "done", "Research complete");
    } catch {
        emit(onProgress, "research", "skipped", "Skipped research (non-critical)");
    }

    // ─── Step 2: Generate Graph Data ─────────────────────────
    emit(onProgress, "generation", "running", "Building knowledge graph structure...");

    const prompt = `Create a knowledge graph about:

"${userPrompt}"

Target approximately ${nodeCountGuide} nodes.
${depthDescription}

${researchNotes ? `Use these researched facts:\n${researchNotes}` : ""}

Output ONLY the JSON object. No markdown fences.`;

    const raw = await generateText({
        prompt,
        systemPrompt: KG_GENERATION_PROMPT,
        temperature: 0.5,
    });

    emit(onProgress, "generation", "done", "Graph structure created");

    // Clean and parse
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const graphData: KnowledgeGraphData = JSON.parse(jsonStr);

    // ─── Step 3: Render to interactive HTML ──────────────────
    emit(onProgress, "rendering", "running", "Rendering interactive visualization...");

    const html = renderKnowledgeGraphHtml(graphData);

    emit(onProgress, "rendering", "done", "Knowledge graph ready");

    return { html, title: graphData.title, graphData };
}

// ─── HTML Renderer ────────────────────────────────────────────────

function renderKnowledgeGraphHtml(data: KnowledgeGraphData): string {
    const escapeHtml = (input: string) =>
        input.replace(/[&<>"']/g, (ch) => {
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

    // Minimal, monochrome palette (used as small accents)
    const CATEGORY_COLORS = [
        "#f5f5f5",
        "#d4d4d4",
        "#a3a3a3",
        "#737373",
        "#e5e5e5",
        "#bdbdbd",
        "#8a8a8a",
        "#5f5f5f",
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
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: linear-gradient(180deg, rgba(5,5,7,0.95) 0%, rgba(5,5,7,0) 100%);
    pointer-events: none;
  }
  #header > * { pointer-events: auto; }
  #header h1 {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #ffffff;
  }
  #header p {
    font-size: 12px;
    color: rgba(245,245,245,0.68);
    margin-top: 2px;
    max-width: min(70vw, 820px);
    line-height: 1.35;
  }

  .legend {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    max-width: 48vw;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: rgba(245,245,245,0.68);
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
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
    max-width: 320px;
    backdrop-filter: blur(20px);
    z-index: 200;
    pointer-events: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  #tooltip .tt-label {
    font-size: 14px;
    font-weight: 600;
    color: #f9fafb;
    margin-bottom: 4px;
  }
  #tooltip .tt-cat {
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 8px;
    opacity: 0.8;
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
    border-radius: 8px;
    color: rgba(245,245,245,0.78);
    padding: 8px 12px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
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
    font-weight: 600;
    fill: rgba(255, 255, 255, 0.95);
    dominant-baseline: middle;
  }
  .node__meta {
    font-size: 11px;
    font-weight: 600;
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
  <div class="legend" id="legend"></div>
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

let W, H;
let hoveredId = null;

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
  dot.style.background = (categoryColors[cat] || '#60a5fa');
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
window.addEventListener('resize', resize);

// Build a rooted tree from graph data (max spanning tree from the most important node)
const nodeById = {};
for (const n of nodes) {
  nodeById[n.id] = {
    ...n,
    color: categoryColors[n.category] || '#60a5fa',
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

  // default: keep it readable by collapsing deeper levels
  const initialCollapseDepth = 2;
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
  mctx.font = '600 13px Inter, -apple-system, sans-serif';
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
    n.w = clamp(w + 42, 140, 280);
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
let rootG = null;

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

function render() {
  computeLayout();
  const { list, links } = collectVisible();
  updateStats();

  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  viewportG = svgEl('g');
  rootG = viewportG;
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

    // Interactions
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
      render();
    });

    viewportG.appendChild(g);
  }

  applyHoverStyles();
}

function applyHoverStyles() {
  if (!viewportG) return;
  const activeId = hoveredId;

  const links = viewportG.querySelectorAll('path.link');
  for (const p of links) {
    const from = p.getAttribute('data-from');
    const to = p.getAttribute('data-to');
    p.classList.toggle('link--active', !!activeId && (from === activeId || to === activeId));
  }

  const nodes = viewportG.querySelectorAll('g.node');
  for (const g of nodes) {
    const id = g.getAttribute('data-id');
    const rect = g.querySelector('rect.node__box');
    if (rect) rect.classList.toggle('node__box--hover', !!activeId && id === activeId);
  }
}

function showTooltip(node, clientX, clientY) {
  tooltip.style.display = 'block';
  tooltip.querySelector('.tt-label').textContent = node.label;
  tooltip.querySelector('.tt-cat').textContent = node.category;
  tooltip.querySelector('.tt-cat').style.color = node.color;
  tooltip.querySelector('.tt-desc').textContent = node.description;

  let tx = clientX + 14;
  let ty = clientY + 14;
  if (tx + 320 > W) tx = clientX - 334;
  if (ty + 140 > H) ty = clientY - 140;
  tooltip.style.left = tx + 'px';
  tooltip.style.top = ty + 'px';
}

// Pan/zoom
svg.addEventListener('mousedown', (e) => {
  // background pan only
  if (e.button !== 0) return;
  if (e.target && e.target.closest && e.target.closest('.node')) return;
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
