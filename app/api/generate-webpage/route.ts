import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { runWebpagePipeline } from "@/lib/agents/webpage-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const prompt = body?.prompt;

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
        return new Response(
            JSON.stringify({ error: "Prompt is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const result = await runWebpagePipeline({
                    userPrompt: prompt,
                    onProgress: (p) => send("progress", p),
                });

                // Save to disk
                const pageId = crypto.randomUUID();
                const outputDir = join(process.cwd(), "output", pageId);
                await mkdir(outputDir, { recursive: true });
                await writeFile(join(outputDir, "index.html"), result.html, "utf-8");

                send("complete", {
                    pageId,
                    title: result.title,
                    html: result.html,
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
