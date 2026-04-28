import { access, readFile, rm } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid history ID" }, { status: 400 });
  }

  const dir = join(process.cwd(), "output", id);
  const metaPath = join(dir, "meta.json");
  const deckPath = join(dir, "deck.json");
  const pptxPath = join(dir, "presentation.pptx");
  const pagePath = join(dir, "index.html");
  const graphDataPath = join(dir, "graph-data.json");

  // Prefer meta.json to determine mode
  if (await fileExists(metaPath)) {
    const metaText = await readFile(metaPath, "utf-8").catch(() => "");
    const meta = safeJsonParse(metaText) as { mode?: string } | null;
    if (meta?.mode === "slides" && (await fileExists(deckPath))) {
      const deckText = await readFile(deckPath, "utf-8").catch(() => "");
      const deck = safeJsonParse(deckText) as { plan?: { title?: string }; slides?: unknown[]; projectSpec?: { output?: string } } | null;
      const slideCount = Array.isArray(deck?.slides) ? deck!.slides.length : 0;
      const hasPptx = await fileExists(pptxPath);
      const hasWeb = deck?.projectSpec?.output !== "pptx";

      return NextResponse.json({
        mode: "slides",
        result: {
          deckId: id,
          title: deck?.plan?.title ?? "Untitled deck",
          slideCount,
          hasPptx,
          hasWeb,
        },
        deck,
      });
    }

    if (meta?.mode === "knowledge-graph" && (await fileExists(pagePath))) {
      const html = await readFile(pagePath, "utf-8").catch(() => "");
      const graphText = await readFile(graphDataPath, "utf-8").catch(() => "");
      const graphData = safeJsonParse(graphText);
      return NextResponse.json({
        mode: "knowledge-graph",
        result: {
          graphId: id,
          title: extractHtmlTitle(html)?.replace(/\s+—\s+Knowledge Graph\s*$/i, "") ?? "Untitled graph",
          html,
          graphData,
        },
      });
    }

    if (meta?.mode === "webpage" && (await fileExists(pagePath))) {
      const html = await readFile(pagePath, "utf-8").catch(() => "");
      return NextResponse.json({
        mode: "webpage",
        result: {
          pageId: id,
          title: extractHtmlTitle(html) ?? "Untitled page",
          html,
        },
      });
    }

  }

  // Fallback detection (older outputs)
  if (await fileExists(deckPath)) {
    const deckText = await readFile(deckPath, "utf-8").catch(() => "");
    const deck = safeJsonParse(deckText) as { plan?: { title?: string }; slides?: unknown[]; projectSpec?: { output?: string } } | null;
    const slideCount = Array.isArray(deck?.slides) ? deck!.slides.length : 0;
    const hasPptx = await fileExists(pptxPath);
    const hasWeb = deck?.projectSpec?.output !== "pptx";
    return NextResponse.json({
      mode: "slides",
      result: {
        deckId: id,
        title: deck?.plan?.title ?? "Untitled deck",
        slideCount,
        hasPptx,
        hasWeb,
      },
      deck,
    });
  }

  if (await fileExists(graphDataPath)) {
    const html = await readFile(pagePath, "utf-8").catch(() => "");
    const graphText = await readFile(graphDataPath, "utf-8").catch(() => "");
    const graphData = safeJsonParse(graphText);
    return NextResponse.json({
      mode: "knowledge-graph",
      result: {
        graphId: id,
        title: extractHtmlTitle(html)?.replace(/\s+—\s+Knowledge Graph\s*$/i, "") ?? "Untitled graph",
        html,
        graphData,
      },
    });
  }

  if (await fileExists(pagePath)) {
    const html = await readFile(pagePath, "utf-8").catch(() => "");
    return NextResponse.json({
      mode: "webpage",
      result: {
        pageId: id,
        title: extractHtmlTitle(html) ?? "Untitled page",
        html,
      },
    });
  }

  return NextResponse.json({ error: "History item not found" }, { status: 404 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid history ID" }, { status: 400 });
  }

  const dir = join(process.cwd(), "output", id);

  try {
    await rm(dir, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to delete history item" },
      { status: 500 },
    );
  }
}
