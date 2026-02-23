import { z } from "zod";
import { generateStructuredWithRetry } from "../gemini";
import {
  BigNumberAssetSchema,
  ChartAssetSchema,
  ChartAssetStrictSchema,
  ImageAssetSchema,
  SlideSpecSchema,
  TableAssetSchema,
} from "../schemas";
import { DeckPlan, SlideSpec } from "../types";
import { CONTENT_SYSTEM_PROMPT } from "./prompts/content";
import { previewText, traceLog } from "../trace";

const TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE_CONTENT || "0.7");
const MIN_IMAGES_PER_DECK = 1;
const MAX_IMAGES_PER_DECK = 3;

/** Zod schema for the batched response — an array of SlideSpecs */
const BatchedSlidesSchema = z.object({
  slides: z.array(SlideSpecSchema),
});

type ChartAsset = z.infer<typeof ChartAssetSchema>;
type BigNumberAsset = z.infer<typeof BigNumberAssetSchema>;
type TableAsset = z.infer<typeof TableAssetSchema>;
type ImageAsset = z.infer<typeof ImageAssetSchema>;

const TableAssetStrictSchema = TableAssetSchema.superRefine((asset, ctx) => {
  const maxCols = 4;
  const maxRows = 7;
  if (asset.headers.length < 2 || asset.headers.length > maxCols) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["headers"],
      message: `Table headers must be 2-${maxCols} columns`,
    });
  }
  if (asset.rows.length < 2 || asset.rows.length > maxRows) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rows"],
      message: `Table rows must be 2-${maxRows} rows`,
    });
  }
  for (const [rIdx, row] of asset.rows.entries()) {
    if (row.length !== asset.headers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rows", rIdx],
        message: "Each row must match headers length",
      });
    }
  }
});

const ImageAssetStrictSchema = ImageAssetSchema.superRefine((asset, ctx) => {
  if (!asset.query.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["query"], message: "query required" });
  }
  if (!asset.alt.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["alt"], message: "alt required" });
  }
});

const BigNumberAssetStrictSchema = BigNumberAssetSchema.superRefine((asset, ctx) => {
  if (asset.value.trim().length > 20) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "value too long" });
  }
  if (asset.label.trim().length > 70) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["label"], message: "label too long" });
  }
});

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

async function generateBigNumberForSlide(opts: {
  slideNumber: number;
  purpose: string;
  title: string;
  bullets: string[];
  researchNotes: string;
}): Promise<BigNumberAsset> {
  const prompt = `Generate ONE big_number asset JSON (no surrounding text) for this slide.

Slide:
- SlideNumber: ${opts.slideNumber}
- Purpose: ${opts.purpose}
- Title: ${opts.title}
- Bullets: ${opts.bullets.map((b) => `• ${b}`).join("\n") || "(none)"}

Research notes (use relevant facts; avoid guessing):
${opts.researchNotes || "(none)"}

Hard requirements:
- type must be "big_number"
- value: short (e.g. "47%", "$2.1B", "3.2×", "1 in 4")
- label: what the number means (max 70 chars)
- context: optional 1 short clause with timeframe/source framing

Make it plausible and specific.`;

  return generateStructuredWithRetry({
    prompt,
    systemPrompt:
      "You are a presentation designer. Return only valid JSON that matches the requested schema.",
    schema: BigNumberAssetStrictSchema,
    schemaName: "BigNumberAsset",
    temperature: Math.min(0.6, TEMPERATURE),
  });
}

async function generateTableForSlide(opts: {
  slideNumber: number;
  purpose: string;
  title: string;
  bullets: string[];
  researchNotes: string;
}): Promise<TableAsset> {
  const prompt = `Generate ONE comparison table asset JSON (no surrounding text) for this slide.

Slide:
- SlideNumber: ${opts.slideNumber}
- Purpose: ${opts.purpose}
- Title: ${opts.title}
- Bullets: ${opts.bullets.map((b) => `• ${b}`).join("\n") || "(none)"}

Research notes (use relevant facts; avoid guessing):
${opts.researchNotes || "(none)"}

Hard requirements:
- type must be "table"
- headers: 2-4 columns, short labels
- rows: 2-7 rows
- each row length MUST equal headers length
- keep cells short (ideally <= 28 chars)

The table should be genuinely useful and match the slide purpose.`;

  return generateStructuredWithRetry({
    prompt,
    systemPrompt:
      "You are a presentation designer. Return only valid JSON that matches the requested schema.",
    schema: TableAssetStrictSchema,
    schemaName: "TableAsset",
    temperature: Math.min(0.6, TEMPERATURE),
  });
}

async function generateImageForSlide(opts: {
  slideNumber: number;
  purpose: string;
  title: string;
  researchNotes: string;
  hint?: string;
}): Promise<ImageAsset> {
  const prompt = `Generate ONE image asset JSON (no surrounding text) for this slide.

Slide:
- SlideNumber: ${opts.slideNumber}
- Purpose: ${opts.purpose}
- Title: ${opts.title}
- Hint: ${opts.hint ?? "(none)"}

Research notes:
${opts.researchNotes || "(none)"}

Hard requirements:
- type must be "image"
- query: 3-8 words, concrete visual (no brand names)
- alt: descriptive alt text (max ~80 chars)

Prefer modern, editorial, high-quality imagery.`;

  return generateStructuredWithRetry({
    prompt,
    systemPrompt:
      "You are a creative director. Return only valid JSON that matches the requested schema.",
    schema: ImageAssetStrictSchema,
    schemaName: "ImageAsset",
    temperature: Math.min(0.7, TEMPERATURE),
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
- If visualIntent is "big_number", include EXACTLY ONE big_number visual.
- If visualIntent is "comparison_table", include EXACTLY ONE table visual.
  - If visualIntent is "photo_grid"/"infographic"/"map", include 1-3 image visuals.
- If visualIntent is "quote", set bullets to a single quote and put the speaker/attribution in subtitle.
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

  traceLog("slides.batch.done", {
    message: "Batched slide JSON generated",
    data: { planned: plan.slideCount, received: result.slides.length },
  });

  // Enforce plan constraints deterministically:
  // - layout must match layoutHint
  // - chart slides must include a valid chart asset with the correct chartType
  // - non-chart slides must not include chart assets
  const bySlideNumber = new Map<number, SlideSpec>(
    result.slides.map((s) => [s.slideNumber, s]),
  );

  const enforced: SlideSpec[] = [];
  for (const [idx, planSlide] of plan.slides.entries()) {
    const slide = bySlideNumber.get(planSlide.slideNumber);
    if (!slide) {
      throw new Error(`Missing generated slide ${planSlide.slideNumber} (plan requires ${plan.slideCount} slides)`);
    }

    traceLog("slide.enforce.start", {
      message: `Slide ${planSlide.slideNumber} enforcing intent/layout`,
      data: {
        slideNumber: planSlide.slideNumber,
        visualIntent: planSlide.visualIntent,
        layoutHint: planSlide.layoutHint,
        title: previewText(slide.title, 120),
      },
    });

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

    const intent = planSlide.visualIntent;
    const allowedTypes =
      required
        ? new Set<SlideSpec["visuals"][number]["type"]>(["chart"])
        : intent === "big_number"
          ? new Set<SlideSpec["visuals"][number]["type"]>(["big_number"])
          : intent === "comparison_table"
            ? new Set<SlideSpec["visuals"][number]["type"]>(["table"])
            : intent === "photo_grid" || intent === "infographic" || intent === "map"
              ? new Set<SlideSpec["visuals"][number]["type"]>(["image"])
              : new Set<SlideSpec["visuals"][number]["type"]>([]);

    visuals = visuals.filter((v) => allowedTypes.has(v.type));

    if (!required && intent === "big_number") {
      const existing = visuals.find((v) => v.type === "big_number");
      if (!existing) {
        const bn = await generateBigNumberForSlide({
          slideNumber: slide.slideNumber,
          purpose: planSlide.purpose,
          title: slide.title,
          bullets: slide.bullets,
          researchNotes,
        });
        visuals = [bn].slice(0, 3);
      } else {
        visuals = [existing as Extract<typeof existing, { type: "big_number" }>];
      }
    }

    if (!required && intent === "comparison_table") {
      const existing = visuals.find((v) => v.type === "table");
      if (!existing) {
        const table = await generateTableForSlide({
          slideNumber: slide.slideNumber,
          purpose: planSlide.purpose,
          title: slide.title,
          bullets: slide.bullets,
          researchNotes,
        });
        visuals = [table].slice(0, 3);
      } else {
        visuals = [existing as Extract<typeof existing, { type: "table" }>];
      }
    }

    if (!required && (intent === "photo_grid" || intent === "infographic" || intent === "map")) {
      const images = visuals.filter((v) => v.type === "image");
      if (images.length === 0) {
        const img = await generateImageForSlide({
          slideNumber: slide.slideNumber,
          purpose: planSlide.purpose,
          title: slide.title,
          hint: intent,
          researchNotes,
        });
        visuals = [img].slice(0, 3);
      } else {
        visuals = images.slice(0, 3);
      }
    }

    let layout: SlideSpec["layout"] = planSlide.layoutHint;

    if (required && !isChartLayout(layout)) layout = "chart_with_text";
    if (!required && intent === "big_number" && layout !== "big_number") layout = "big_number";
    if (!required && intent === "comparison_table" && layout !== "two_column") layout = "two_column";
    if (
      !required &&
      (intent === "photo_grid" || intent === "infographic" || intent === "map") &&
      layout !== "full_visual"
    ) {
      layout = "full_visual";
    }
    if ((layout === "full_visual" || layout === "big_number") && visuals.length === 0) {
      layout = "bullets";
    }

    enforced.push({
      ...slide,
      layout,
      visuals,
    });

    traceLog("slide.enforce.done", {
      message: `Slide ${planSlide.slideNumber} ready`,
      data: {
        slideNumber: planSlide.slideNumber,
        layout,
        bullets: slide.bullets.length,
        visuals: visuals.map((v) => v.type),
      },
    });

    onProgress?.(idx + 1, plan.slides.length);
  }

  let normalized = enforced.sort((a, b) => a.slideNumber - b.slideNumber);

  // Enforce deck-wide image bounds: always keep 1-3 image visuals total.
  const imageRefs = normalized.flatMap((slide, slideIdx) =>
    slide.visuals
      .map((v, visualIdx) => ({ slideIdx, visualIdx, type: v.type }))
      .filter((ref) => ref.type === "image"),
  );

  if (imageRefs.length > MAX_IMAGES_PER_DECK) {
    const keepKeys = new Set(
      imageRefs
        .slice(0, MAX_IMAGES_PER_DECK)
        .map((ref) => `${ref.slideIdx}:${ref.visualIdx}`),
    );

    normalized = normalized.map((slide, slideIdx) => {
      const visuals = slide.visuals.filter((_, visualIdx) =>
        keepKeys.has(`${slideIdx}:${visualIdx}`) || slide.visuals[visualIdx]?.type !== "image",
      );

      const hasVisual = visuals.length > 0;
      const layout =
        (slide.layout === "full_visual" || slide.layout === "big_number") && !hasVisual
          ? "bullets"
          : slide.layout;

      return { ...slide, visuals, layout };
    });

    traceLog("slides.images.capped", {
      level: "warn",
      message: "Capped deck image visuals to max",
      data: { before: imageRefs.length, after: MAX_IMAGES_PER_DECK, max: MAX_IMAGES_PER_DECK },
    });
  }

  const finalImageCount = normalized.flatMap((s) => s.visuals).filter((v) => v.type === "image").length;
  if (finalImageCount < MIN_IMAGES_PER_DECK) {
    const eligiblePlan = plan.slides.find((s) => s.layoutHint !== "title_slide");
    const targetSlide = normalized.find((s) => s.slideNumber === (eligiblePlan?.slideNumber ?? 1));
    if (targetSlide) {
      const img = await generateImageForSlide({
        slideNumber: targetSlide.slideNumber,
        purpose: eligiblePlan?.purpose ?? "supporting visual",
        title: targetSlide.title,
        hint: "infographic",
        researchNotes,
      });

      normalized = normalized.map((slide) =>
        slide.slideNumber === targetSlide.slideNumber
          ? {
              ...slide,
              layout: "full_visual",
              visuals: [img, ...slide.visuals.filter((v) => v.type !== "image")].slice(0, 3),
            }
          : slide,
      );

      traceLog("slides.images.injected", {
        message: "Injected fallback image to satisfy minimum image count",
        data: { min: MIN_IMAGES_PER_DECK, targetSlideNumber: targetSlide.slideNumber },
      });
    }
  }

  return normalized;
}
