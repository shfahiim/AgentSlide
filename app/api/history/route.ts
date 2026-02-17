import { access, readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type HistoryMode = "slides" | "webpage" | "knowledge-graph" | "study-yt";

interface HistoryListItem {
  id: string;
  mode: HistoryMode;
  title: string;
  prompt?: string;
  createdAt: number;
  subtitle?: string;
  hasPptx?: boolean;
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractHtmlTitle(html: string) {
  const m = html.match(/<title>\s*([^<]{1,200})\s*<\/title>/i);
  return m?.[1]?.trim();
}

export async function GET() {
  const outputRoot = join(process.cwd(), "output");
  let dirs: string[] = [];

  try {
    const entries = await readdir(outputRoot, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory() && UUID_RE.test(e.name)).map((e) => e.name);
  } catch {
    return NextResponse.json({ items: [] satisfies HistoryListItem[] });
  }

  const items: HistoryListItem[] = [];

  for (const id of dirs) {
    const dir = join(outputRoot, id);
    const metaPath = join(dir, "meta.json");
    const deckPath = join(dir, "deck.json");
    const pptxPath = join(dir, "presentation.pptx");
    const pagePath = join(dir, "index.html");
    const graphDataPath = join(dir, "graph-data.json");

    const createdAtFallback = await stat(dir).then((s) => s.mtimeMs).catch(() => Date.now());

    // Prefer meta.json when present
    if (await fileExists(metaPath)) {
      const metaText = await readFile(metaPath, "utf-8").catch(() => "");
      const meta = safeJsonParse(metaText) as
        | {
            mode?: HistoryMode;
            title?: string;
            prompt?: string;
            createdAt?: number;
            slideCount?: number;
            nodeCount?: number;
            edgeCount?: number;
            depth?: number;
            hasPptx?: boolean;
            videoId?: string;
          }
        | null;

      if (meta?.mode && meta?.title) {
        const subtitle =
          meta.mode === "slides"
            ? typeof meta.slideCount === "number"
              ? `${meta.slideCount} slides`
              : undefined
            : meta.mode === "knowledge-graph"
              ? typeof meta.nodeCount === "number" && typeof meta.edgeCount === "number"
                ? `${meta.nodeCount} nodes · ${meta.edgeCount} edges${typeof meta.depth === "number" ? ` · depth ${meta.depth}` : ""}`
                : undefined
              : meta.mode === "study-yt"
                ? meta.videoId
                  ? `YouTube · ${meta.videoId}`
                  : "YouTube"
              : undefined;

        items.push({
          id,
          mode: meta.mode,
          title: meta.title,
          prompt: meta.prompt,
          createdAt: typeof meta.createdAt === "number" ? meta.createdAt : createdAtFallback,
          subtitle,
          hasPptx: meta.mode === "slides" ? meta.hasPptx : undefined,
        });
        continue;
      }
    }

    // Fallback detection for older outputs (no meta.json)
    if (await fileExists(deckPath)) {
      const deckText = await readFile(deckPath, "utf-8").catch(() => "");
      const deck = safeJsonParse(deckText) as { plan?: { title?: string }; slides?: unknown[]; projectSpec?: { output?: string } } | null;
      const hasPptx = await fileExists(pptxPath);
      const slideCount = Array.isArray(deck?.slides) ? deck!.slides.length : undefined;
      const hasWeb = deck?.projectSpec?.output !== "pptx";
      items.push({
        id,
        mode: "slides",
        title: deck?.plan?.title ?? "Untitled deck",
        createdAt: createdAtFallback,
        subtitle: typeof slideCount === "number" ? `${slideCount} slides${hasWeb ? "" : " · pptx-only"}` : undefined,
        hasPptx,
      });
      continue;
    }

    if (await fileExists(graphDataPath)) {
      const graphText = await readFile(graphDataPath, "utf-8").catch(() => "");
      const graph = safeJsonParse(graphText) as { title?: string; nodes?: unknown[]; edges?: unknown[] } | null;
      const nodeCount = Array.isArray(graph?.nodes) ? graph!.nodes.length : undefined;
      const edgeCount = Array.isArray(graph?.edges) ? graph!.edges.length : undefined;
      items.push({
        id,
        mode: "knowledge-graph",
        title: graph?.title ?? "Untitled graph",
        createdAt: createdAtFallback,
        subtitle:
          typeof nodeCount === "number" && typeof edgeCount === "number"
            ? `${nodeCount} nodes · ${edgeCount} edges`
            : undefined,
      });
      continue;
    }

    if (await fileExists(pagePath)) {
      const html = await readFile(pagePath, "utf-8").catch(() => "");
      items.push({
        id,
        mode: "webpage",
        title: extractHtmlTitle(html) ?? "Untitled page",
        createdAt: createdAtFallback,
      });
      continue;
    }
  }

  items.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items });
}
