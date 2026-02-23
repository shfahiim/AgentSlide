import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/agents/orchestrator";
import { renderToPptx } from "@/lib/renderers/pptx-renderer";
import { createTraceWriter, previewText, traceLog, withTraceContext } from "@/lib/trace";
import { getTheme } from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prompt = body?.prompt;
  const theme = body?.theme;
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

      const deckId = crypto.randomUUID();
      const outputDir = join(process.cwd(), "output", deckId);
      await mkdir(outputDir, { recursive: true });

      const { ctx, writer } = await createTraceWriter({
        deckId,
        filePath: join(outputDir, "trace.jsonl"),
        sendToClient: (evt) =>
          send("log", {
            ...evt,
            // Keep client payload compact
            message: evt.message ? previewText(evt.message, 240) : undefined,
            data: evt.data ? previewText(evt.data, 600) : undefined,
          }),
      });

      try {
        await withTraceContext(ctx, async () => {
          traceLog("request.start", {
            message: "Generate deck request received",
            data: { prompt: previewText(prompt, 600), hasApprovedPlan: Boolean(approvedPlan), theme },
          });

          const deckSpec = await runPipeline({
            userPrompt: prompt,
            approvedPlan,
            onProgress: (p) => send("progress", p),
          });

          // Apply user-selected theme if provided
          if (theme && typeof theme === "string") {
            deckSpec.plan.suggestedTheme = theme as typeof deckSpec.plan.suggestedTheme;
            traceLog("theme.override", {
              message: "User-selected theme applied",
              data: { theme },
            });
          }

          await writeFile(join(outputDir, "deck.json"), JSON.stringify(deckSpec, null, 2));

        let hasPptx = false;
        const createdAt = Date.now();
        if (deckSpec.projectSpec.output !== "web") {
          traceLog("pptx.start", { message: "Rendering PPTX" });
          send("progress", { step: "rendering", status: "running", message: "Building PPTX", timestamp: Date.now() });
          const buffer = await renderToPptx(deckSpec, getTheme(deckSpec.plan.suggestedTheme), {
            assetDir: join(outputDir, "assets"),
          });
          await writeFile(join(outputDir, "presentation.pptx"), buffer);
          hasPptx = true;
          send("progress", { step: "rendering", status: "done", message: "PPTX ready", timestamp: Date.now() });
          traceLog("pptx.done", { message: "PPTX rendered" });
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
              traceFile: "trace.jsonl",
            },
            null,
            2,
          ),
          "utf-8",
        );

        send("complete", { deckId, title: deckSpec.plan.title, slideCount: deckSpec.slides.length, hasPptx, hasWeb: deckSpec.projectSpec.output !== "pptx" });
          traceLog("request.complete", {
            message: "Deck generation complete",
            data: { slideCount: deckSpec.slides.length, hasPptx, hasWeb: deckSpec.projectSpec.output !== "pptx" },
          });
        });
      } catch (error) {
        writer.write({
          deckId,
          level: "error",
          name: "request.error",
          message: (error as Error).message,
          data: { stack: (error as Error).stack ? previewText((error as Error).stack, 1200) : undefined },
        });
        send("error", { message: (error as Error).message });
      } finally {
        await writer.close();
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
