import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/agents/orchestrator";
import { renderToPptx } from "@/lib/renderers/pptx-renderer";
import { getTheme } from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prompt = body?.prompt;
  const approvedPlan = body?.approvedPlan;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const deckSpec = await runPipeline({ userPrompt: prompt, approvedPlan, onProgress: (p) => send("progress", p) });
        const deckId = crypto.randomUUID();
        const outputDir = join(process.cwd(), "output", deckId);
        await mkdir(outputDir, { recursive: true });
        await writeFile(join(outputDir, "deck.json"), JSON.stringify(deckSpec, null, 2));

        let hasPptx = false;
        const createdAt = Date.now();
        if (deckSpec.projectSpec.output !== "web") {
          send("progress", { step: "rendering", status: "running", message: "Building PPTX", timestamp: Date.now() });
          const buffer = await renderToPptx(deckSpec, getTheme(deckSpec.plan.suggestedTheme));
          await writeFile(join(outputDir, "presentation.pptx"), buffer);
          hasPptx = true;
          send("progress", { step: "rendering", status: "done", message: "PPTX ready", timestamp: Date.now() });
        }

        await writeFile(
          join(outputDir, "meta.json"),
          JSON.stringify(
            {
              id: deckId,
              mode: "slides",
              title: deckSpec.plan.title,
              prompt,
              createdAt,
              slideCount: deckSpec.slides.length,
              hasPptx,
              hasWeb: deckSpec.projectSpec.output !== "pptx",
            },
            null,
            2,
          ),
          "utf-8",
        );

        send("complete", { deckId, title: deckSpec.plan.title, slideCount: deckSpec.slides.length, hasPptx, hasWeb: deckSpec.projectSpec.output !== "pptx" });
      } catch (error) {
        send("error", { message: (error as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
