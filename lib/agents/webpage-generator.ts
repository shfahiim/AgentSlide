import { generateText } from "../gemini";
import { WEBPAGE_SYSTEM_PROMPT, WEBPAGE_RESEARCH_PROMPT } from "./prompts/webpage";
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

export interface WebpageGeneratorOptions {
    userPrompt: string;
    onProgress?: ProgressCallback;
}

export interface WebpageResult {
    html: string;
    title: string;
}

export async function runWebpagePipeline(opts: WebpageGeneratorOptions): Promise<WebpageResult> {
    const { userPrompt, onProgress } = opts;

    // ─── Step 1: Research ─────────────────────────────────────
    emit(onProgress, "research", "running", "Researching data and statistics...");
    let researchNotes = "";
    try {
        researchNotes = await generateText({
            prompt: `Research the following topic thoroughly for a data-rich visual webpage:\n\n${userPrompt}\n\nProvide specific numbers, statistics, comparison data, timeline events, and regional breakdowns.`,
            systemPrompt: WEBPAGE_RESEARCH_PROMPT,
            temperature: 0.3,
        });
        emit(onProgress, "research", "done", "Research complete");
    } catch {
        emit(onProgress, "research", "skipped", "Skipped research (non-critical)");
    }

    // ─── Step 2: Generate the webpage ─────────────────────────
    emit(onProgress, "generation", "running", "Designing and coding webpage...");

    const prompt = `Create a stunning, data-rich single-page webpage about:

"${userPrompt}"

${researchNotes ? `Use these researched facts and data to create accurate charts and visualizations:\n${researchNotes}` : ""}

Remember: Output ONLY the raw HTML. Start with <!DOCTYPE html>. No markdown fences. No explanations.`;

    const raw = await generateText({
        prompt,
        systemPrompt: WEBPAGE_SYSTEM_PROMPT,
        temperature: 0.7,
    });

    emit(onProgress, "generation", "done", "Webpage generated");

    // Clean: strip any markdown fencing the model might have added
    let html = raw.trim();
    if (html.startsWith("```html")) html = html.slice(7);
    if (html.startsWith("```")) html = html.slice(3);
    if (html.endsWith("```")) html = html.slice(0, -3);
    html = html.trim();

    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch?.[1] ?? userPrompt.slice(0, 60);

    return { html, title };
}
