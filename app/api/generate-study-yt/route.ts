import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { runStudyYtPipeline } from "@/lib/agents/study-yt-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = body?.url;

  if (typeof url !== "string" || url.trim().length === 0) {
    return new Response(JSON.stringify({ error: "YouTube URL is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const result = await runStudyYtPipeline({
          urlOrId: url,
          onProgress: (p) => send("progress", p),
        });

        const pageId = crypto.randomUUID();
        const outputDir = join(process.cwd(), "output", pageId);
        await mkdir(outputDir, { recursive: true });
        await writeFile(join(outputDir, "index.html"), result.html, "utf-8");
        await writeFile(
          join(outputDir, "meta.json"),
          JSON.stringify(
            {
              id: pageId,
              mode: "study-yt",
              title: result.title,
              prompt: url,
              createdAt: Date.now(),
              videoId: result.videoId,
              videoUrl: result.videoUrl,
            },
            null,
            2,
          ),
          "utf-8",
        );

        send("complete", {
          pageId,
          title: result.title,
          html: result.html,
          videoId: result.videoId,
          videoUrl: result.videoUrl,
        });
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

