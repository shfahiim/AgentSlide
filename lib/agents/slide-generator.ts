import { z } from "zod";
import { generateStructuredWithRetry } from "../gemini";
import { SlideSpecSchema } from "../schemas";
import { DeckPlan, SlideSpec } from "../types";
import { CONTENT_SYSTEM_PROMPT } from "./prompts/content";

const TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE_CONTENT || "0.7");

/** Zod schema for the batched response — an array of SlideSpecs */
const BatchedSlidesSchema = z.object({
  slides: z.array(SlideSpecSchema),
});

/**
 * JSON format description embedded in the prompt for Gemini.
 * Describes the structure for ALL slides at once.
 */
const SLIDES_JSON_FORMAT = `You MUST return a JSON object with a "slides" array. Each element must match this structure:
{
  "slides": [
    {
      "slideNumber": <number>,
      "title": "<string, max 80 chars>",
      "subtitle": "<string, max 120 chars, optional>",
      "bullets": ["<string, max 100 chars each, max 6 items>"],
      "speakerNotes": "<string, max 500 chars, optional>",
      "layout": "<one of: title_slide, bullets, two_column, chart_with_text, full_visual, big_number>",
      "visuals": [
        // For charts:
        { "type": "chart", "chartType": "<bar|line|pie|timeline|area>", "title": "<string>",
          "data": { "labels": ["<string>"], "datasets": [{"label": "<string>", "values": [<number>]}] }
        },
        // For images:
        { "type": "image", "query": "<search query>", "alt": "<alt text>" },
        // For tables:
        { "type": "table", "headers": ["<string>"], "rows": [["<string>"]] },
        // For big numbers:
        { "type": "big_number", "value": "<string>", "label": "<string>", "context": "<string, optional>" }
      ]
    }
  ]
}

Only include visuals that match each slide's visual intent. If visualIntent is "none", use an empty visuals array.`;

/**
 * Generates ALL slides in a single API call.
 * This reduces N API calls down to 1, significantly cutting latency and cost.
 */
export async function runSlideGeneration(
  plan: DeckPlan,
  researchNotes: string,
  onProgress?: (slideNum: number, total: number) => void,
): Promise<SlideSpec[]> {
  onProgress?.(0, plan.slides.length);

  const slidePlans = plan.slides
    .map(
      (s) =>
        `- Slide ${s.slideNumber}: Purpose="${s.purpose}", VisualIntent="${s.visualIntent}", Layout="${s.layoutHint}"`,
    )
    .join("\n");

  const prompt = `Generate content for ALL ${plan.slideCount} slides of the presentation "${plan.title}".

Slide plans:
${slidePlans}

Presentation context:
- Total slides: ${plan.slideCount}
- Theme: ${plan.suggestedTheme}

Research notes (use relevant facts):
${researchNotes}

${SLIDES_JSON_FORMAT}

Generate exactly ${plan.slideCount} slides in the array, one for each slide plan above.`;

  const result = await generateStructuredWithRetry({
    prompt,
    systemPrompt: CONTENT_SYSTEM_PROMPT,
    schema: BatchedSlidesSchema,
    schemaName: "BatchedSlides",
    temperature: TEMPERATURE,
    useJsonMode: true,
  });

  // Report all slides as done
  result.slides.forEach((_, idx) => {
    onProgress?.(idx + 1, plan.slides.length);
  });

  return result.slides.sort((a, b) => a.slideNumber - b.slideNumber);
}
