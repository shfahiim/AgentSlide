import { z } from "zod";
import { generateStructuredWithRetry } from "../gemini";
import { ChartAssetSchema, ChartAssetStrictSchema, SlideSpecSchema } from "../schemas";
import { DeckPlan, SlideSpec } from "../types";
import { CONTENT_SYSTEM_PROMPT } from "./prompts/content";

const TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE_CONTENT || "0.7");

/** Zod schema for the batched response — an array of SlideSpecs */
const BatchedSlidesSchema = z.object({
  slides: z.array(SlideSpecSchema),
});

type ChartAsset = z.infer<typeof ChartAssetSchema>;

function requiredChartType(visualIntent: DeckPlan["slides"][number]["visualIntent"]): ChartAsset["chartType"] | null {
  switch (visualIntent) {
    case "bar_chart":
      return "bar";
    case "line_chart":
      return "line";
    case "pie_chart":
      return "pie";
    case "timeline":
      return "timeline";
    default:
      return null;
  }
}

function isChartLayout(layout: SlideSpec["layout"]) {
  return layout === "chart_with_text" || layout === "full_visual";
}

async function generateChartForSlide(opts: {
  slideNumber: number;
  purpose: string;
  title: string;
  bullets: string[];
  chartType: ChartAsset["chartType"];
  researchNotes: string;
}): Promise<ChartAsset> {
  const prompt = `Generate ONE chart asset JSON (no surrounding text) for this slide.

Slide:
- SlideNumber: ${opts.slideNumber}
- Purpose: ${opts.purpose}
- Title: ${opts.title}
- Bullets: ${opts.bullets.map((b) => `• ${b}`).join("\n") || "(none)"}

Research notes (use relevant facts; avoid guessing):
${opts.researchNotes || "(none)"}

Hard requirements:
- type must be "chart"
- chartType must be exactly "${opts.chartType}"
- title: max 80 chars
- data.labels: 3-8 items, each max 15 chars
- data.datasets: 1-2 datasets, each label max 30 chars
- each dataset.values length MUST equal labels length
- values must be finite numbers (no NaN/Infinity)
- pie charts: values must be >= 0

Pick units that make sense (%, $, count, etc.). Use realistic magnitudes.`;

  return generateStructuredWithRetry({
    prompt,
    systemPrompt:
      "You are a data visualization expert. Return only valid JSON that matches the requested schema.",
    schema: ChartAssetStrictSchema,
    schemaName: "ChartAsset",
    temperature: Math.min(0.6, TEMPERATURE),
  });
}

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

Rules:
- You MUST follow each slide plan's Layout hint exactly (set "layout" to that value).
- You MUST follow each slide plan's VisualIntent:
  - If VisualIntent is bar_chart/line_chart/pie_chart/timeline, include EXACTLY ONE chart visual.
    - chartType mapping: bar_chart→bar, line_chart→line, pie_chart→pie, timeline→timeline
  - If VisualIntent is none/quote/map/photo_grid/comparison_table/infographic/big_number, do NOT include a chart visual.
- Only include visuals that match each slide's visual intent.
- If visualIntent is "none", use an empty visuals array.`;

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

  // Enforce plan constraints deterministically:
  // - layout must match layoutHint
  // - chart slides must include a valid chart asset with the correct chartType
  // - non-chart slides must not include chart assets
  const bySlideNumber = new Map<number, SlideSpec>(
    result.slides.map((s) => [s.slideNumber, s]),
  );

  const enforced: SlideSpec[] = [];
  for (const planSlide of plan.slides) {
    const slide = bySlideNumber.get(planSlide.slideNumber);
    if (!slide) {
      throw new Error(`Missing generated slide ${planSlide.slideNumber} (plan requires ${plan.slideCount} slides)`);
    }

    const required = requiredChartType(planSlide.visualIntent);
    let visuals = slide.visuals ?? [];

    if (required) {
      const existing = visuals.find((v) => v.type === "chart");
      const chartOk =
        existing?.type === "chart" && existing.chartType === required;

      if (!chartOk) {
        const chart = await generateChartForSlide({
          slideNumber: slide.slideNumber,
          purpose: planSlide.purpose,
          title: slide.title,
          bullets: slide.bullets,
          chartType: required,
          researchNotes,
        });

        visuals = [chart, ...visuals.filter((v) => v.type !== "chart")].slice(0, 3);
      } else {
        // Ensure the required chart is first for renderers that pick the first chart
        const chart = existing as Extract<typeof existing, { type: "chart" }>;
        visuals = [chart, ...visuals.filter((v) => v !== existing)].slice(0, 3);
      }
    } else {
      visuals = visuals.filter((v) => v.type !== "chart");
    }

    const layout: SlideSpec["layout"] =
      required && !isChartLayout(planSlide.layoutHint)
        ? "chart_with_text"
        : planSlide.layoutHint;

    enforced.push({
      ...slide,
      layout,
      visuals,
    });
  }

  // Report all slides as done
  enforced.forEach((_, idx) => {
    onProgress?.(idx + 1, plan.slides.length);
  });

  return enforced.sort((a, b) => a.slideNumber - b.slideNumber);
}
