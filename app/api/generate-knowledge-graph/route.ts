import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { runKnowledgeGraphPipeline } from "@/lib/agents/knowledge-graph-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const prompt = body?.prompt;
    const depth = body?.depth ?? 2;

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
                const result = await runKnowledgeGraphPipeline({
                    userPrompt: prompt,
                    depth,
                    onProgress: (p) => send("progress", p),
                });

                // Save to disk
                const graphId = crypto.randomUUID();
                const outputDir = join(process.cwd(), "output", graphId);
                await mkdir(outputDir, { recursive: true });
                await writeFile(join(outputDir, "index.html"), result.html, "utf-8");
                await writeFile(
                    join(outputDir, "graph-data.json"),
                    JSON.stringify(result.graphData, null, 2),
                    "utf-8"
                );

                send("complete", {
                    graphId,
                    title: result.title,
                    html: result.html,
                    graphData: result.graphData,
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
