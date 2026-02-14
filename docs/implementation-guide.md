# 🛠️ SlideMaker — Implementation Guide

> Step-by-step coding guide for building the SlideMaker AI Presentation Agent.
> Read [architecture.md](./architecture.md) first for the high-level design.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 20.x | Runtime |
| pnpm / npm | Latest | Package manager |
| Gemini API Key | — | `GOOGLE_GENAI_API_KEY` env var |

---

## Phase 1 — Project Scaffolding & Schemas

> **Goal**: Set up the Next.js project and define every Zod schema that the rest of the codebase depends on.

### 1.1 — Initialize the Project

```bash
npx -y create-next-app@latest ./ \
  --ts --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --use-pnpm
```

Then install core dependencies:

```bash
pnpm add @google/genai zod zod-to-json-schema pptxgenjs vega vega-lite vega-lite-api framer-motion
```

Install Shadcn UI:

```bash
pnpm dlx shadcn@latest init
# Choose: New York style, Zinc base color, CSS variables: yes
```

Add the Shadcn components we'll need upfront:

```bash
pnpm dlx shadcn@latest add button card input textarea select tabs badge progress separator toast dialog dropdown-menu
```

### 1.2 — Environment Setup

Create `.env.local`:

```env
GOOGLE_GENAI_API_KEY=your_api_key_here

# Optional dev toggles
NEXT_PUBLIC_DEBUG_MODE=false
```

Add to `.gitignore`:

```
.env.local
/output/        # generated PPTX files
```

### 1.3 — Define All Zod Schemas

> **File**: `lib/schemas.ts`

This is the **single source of truth** for the entire IR. Every agent step, every renderer, every API route imports from here.

**What to implement** (copy the schemas from `architecture.md` and wire them together):

```typescript
// lib/schemas.ts
import { z } from "zod";

// ─── Asset Specs (must be defined first, referenced by SlideSpec) ────────

export const ChartAssetSchema = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "line", "pie", "timeline", "area"]),
  title: z.string(),
  data: z.object({
    labels: z.array(z.string()),
    datasets: z.array(z.object({
      label: z.string(),
      values: z.array(z.number()),
    })),
  }),
  vegaLiteSpec: z.record(z.any()).optional(),
});

export const ImageAssetSchema = z.object({
  type: z.literal("image"),
  query: z.string(),
  url: z.string().url().optional(),
  alt: z.string(),
  cropMode: z.enum(["fill", "fit", "contain"]).default("fill"),
});

export const TableAssetSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const BigNumberAssetSchema = z.object({
  type: z.literal("big_number"),
  value: z.string(),
  label: z.string(),
  context: z.string().optional(),
});

export const AssetSpecSchema = z.discriminatedUnion("type", [
  ChartAssetSchema,
  ImageAssetSchema,
  TableAssetSchema,
  BigNumberAssetSchema,
]);

// ─── Citation ────────────────────────────────────────────────────────────

export const CitationSchema = z.object({
  text: z.string(),
  url: z.string().url().optional(),
  placement: z.enum(["footnote", "speaker_notes", "end_slide"]),
});

// ─── Core IR Models ─────────────────────────────────────────────────────

export const AUDIENCES = ["high_school", "university", "investors", "general"] as const;
export const STYLES = ["academic", "minimal", "modern", "corporate", "vibrant"] as const;
export const OUTPUTS = ["pptx", "web", "both"] as const;
export const LANGUAGES = ["en", "bn"] as const;
export const CITATION_STYLES = ["footnote", "speaker_notes", "end_slide", "none"] as const;

export const VISUAL_INTENTS = [
  "none", "timeline", "map", "bar_chart", "line_chart", "pie_chart",
  "photo_grid", "quote", "comparison_table", "infographic", "big_number",
] as const;

export const LAYOUTS = [
  "title_slide", "bullets", "two_column",
  "chart_with_text", "full_visual", "big_number",
] as const;

export const ProjectSpecSchema = z.object({
  topic: z.string(),
  audience: z.enum(AUDIENCES).default("general"),
  durationMinutes: z.number().optional(),
  style: z.enum(STYLES).default("modern"),
  output: z.enum(OUTPUTS).default("both"),
  language: z.enum(LANGUAGES).default("en"),
  citationStyle: z.enum(CITATION_STYLES).default("speaker_notes"),
  slideCountPreference: z.number().optional(),
});

export const DeckPlanSlideSchema = z.object({
  slideNumber: z.number(),
  purpose: z.string(),
  visualIntent: z.enum(VISUAL_INTENTS),
  layoutHint: z.enum(LAYOUTS),
});

export const DeckPlanSchema = z.object({
  title: z.string(),
  slideCount: z.number().min(3).max(30),
  slides: z.array(DeckPlanSlideSchema),
  suggestedTheme: z.string(),
});

export const SlideSpecSchema = z.object({
  slideNumber: z.number(),
  title: z.string().max(80),
  subtitle: z.string().max(120).optional(),
  bullets: z.array(z.string().max(100)).max(6),
  speakerNotes: z.string().max(500).optional(),
  layout: z.enum(LAYOUTS),
  visuals: z.array(AssetSpecSchema).max(3),
  citations: z.array(CitationSchema).optional(),
});

// ─── Complete Deck Output ───────────────────────────────────────────────

export const DeckSpecSchema = z.object({
  projectSpec: ProjectSpecSchema,
  plan: DeckPlanSchema,
  slides: z.array(SlideSpecSchema),
});

// ─── Theme Spec ─────────────────────────────────────────────────────────

export const ThemeSpecSchema = z.object({
  name: z.string(),
  colors: z.object({
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    heading: z.string(),
    accent: z.string(),
    accentSecondary: z.string(),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  borderRadius: z.number().default(8),
});
```

### 1.4 — Infer TypeScript Types

> **File**: `lib/types.ts`

```typescript
// lib/types.ts
import { z } from "zod";
import {
  ProjectSpecSchema, DeckPlanSchema, SlideSpecSchema,
  AssetSpecSchema, DeckSpecSchema, ThemeSpecSchema,
  DeckPlanSlideSchema, CitationSchema,
} from "./schemas";

export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
export type DeckPlan = z.infer<typeof DeckPlanSchema>;
export type DeckPlanSlide = z.infer<typeof DeckPlanSlideSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;
export type AssetSpec = z.infer<typeof AssetSpecSchema>;
export type DeckSpec = z.infer<typeof DeckSpecSchema>;
export type ThemeSpec = z.infer<typeof ThemeSpecSchema>;
export type Citation = z.infer<typeof CitationSchema>;

// ─── Agent Pipeline Types ───────────────────────────────────────────────

export type AgentStepName =
  | "intake"
  | "planning"
  | "research"
  | "generation"
  | "assets"
  | "qa"
  | "rendering";

export type StepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface PipelineProgress {
  step: AgentStepName;
  status: StepStatus;
  message: string;
  detail?: string;            // e.g. "Generating slide 3/10"
  timestamp: number;
}

export interface GenerationResult {
  deckSpec: DeckSpec;
  pptxBuffer?: Buffer;        // populated if output includes pptx
  webDeckId?: string;         // ID for web viewer route
}
```

### 1.5 — Verify Phase 1

```bash
pnpm build   # should compile with no type errors
```

At this point your `lib/` folder has `schemas.ts` and `types.ts` — the entire IR is defined and type-safe.

---

## Phase 2 — Gemini Client & Structured Output Helper

> **Goal**: Create a reusable wrapper around `@google/genai` that enforces structured outputs via Zod schemas.

### 2.1 — Gemini Client

> **File**: `lib/gemini.ts`

```typescript
// lib/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
});

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Call Gemini with structured output enforcement.
 * Returns parsed + validated data, or throws on validation failure.
 */
export async function generateStructured<T>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodSchema<T>;
  schemaName: string;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const jsonSchema = zodToJsonSchema(opts.schema, opts.schemaName);

  const response = await genai.models.generateContent({
    model: opts.model ?? DEFAULT_MODEL,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: opts.temperature ?? 0.7,
      responseMimeType: "application/json",
      responseSchema: jsonSchema as any,
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text);
  return opts.schema.parse(parsed);  // Zod validation — throws ZodError if invalid
}

/**
 * Wrapper with automatic retries on Zod validation failure.
 * Feeds the Zod error back to the model so it can self-correct.
 */
export async function generateStructuredWithRetry<T>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodSchema<T>;
  schemaName: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // On retry, append the error feedback to the prompt
      const prompt = lastError
        ? `${opts.prompt}\n\n---\nPREVIOUS ATTEMPT FAILED VALIDATION:\n${lastError.message}\nPlease fix the output and try again.`
        : opts.prompt;

      return await generateStructured({ ...opts, prompt });
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxRetries) throw lastError;
      console.warn(`[Gemini] Attempt ${attempt} failed, retrying...`, lastError.message);
    }
  }

  throw lastError; // unreachable, but satisfies TS
}

/**
 * Simple unstructured text generation (for speaker notes, compression, etc.)
 */
export async function generateText(opts: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const response = await genai.models.generateContent({
    model: opts.model ?? DEFAULT_MODEL,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: opts.temperature ?? 0.7,
    },
  });

  return response.text ?? "";
}
```

### 2.2 — Verify Phase 2

Write a quick smoke test script (optional, `scripts/test-gemini.ts`):

```typescript
// scripts/test-gemini.ts
import { generateStructuredWithRetry } from "../lib/gemini";
import { ProjectSpecSchema } from "../lib/schemas";

async function main() {
  const result = await generateStructuredWithRetry({
    prompt: "Create a presentation about the history of Bangladesh for university students. 10 slides.",
    systemPrompt: "Extract the user's presentation requirements into a structured ProjectSpec.",
    schema: ProjectSpecSchema,
    schemaName: "ProjectSpec",
  });
  console.log("ProjectSpec:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
```

Run with:

```bash
npx tsx scripts/test-gemini.ts
```

---

## Phase 3 — Agent Pipeline (Steps A → F)

> **Goal**: Build each agent step as an independent module, then wire them together via the orchestrator.

### 3.1 — System Prompts

Create a dedicated file per agent step. These are the actual instructions sent to Gemini.

> **Directory**: `lib/agents/prompts/`

#### `lib/agents/prompts/intake.ts`

```typescript
export const INTAKE_SYSTEM_PROMPT = `You are a presentation requirements parser.

Given a user's free-text prompt, extract structured presentation requirements.

Rules:
- Always extract a clear topic
- Infer audience from context clues (e.g. "for my class" → university)
- If the user mentions slide count, use it; otherwise leave slideCountPreference empty
- Default style to "modern" unless the user implies otherwise
- Default output to "both" (PPTX + Web)
- Default language to "en" unless the prompt is in another language

Be decisive — never leave topic empty. Pick the best interpretation.`;
```

#### `lib/agents/prompts/planner.ts`

```typescript
export const PLANNER_SYSTEM_PROMPT = `You are a presentation structure planner.

Given a ProjectSpec, create a detailed slide-by-slide plan (DeckPlan).

Rules:
- First slide is ALWAYS a title slide
- Last slide should be a summary, conclusion, or Q&A slide
- Choose visualIntent based on what data would naturally support the slide's purpose:
  - Use "bar_chart" for comparisons, rankings, quantities
  - Use "line_chart" for trends over time
  - Use "pie_chart" for proportions / market share
  - Use "timeline" for chronological sequences
  - Use "comparison_table" for side-by-side comparisons
  - Use "big_number" for impactful statistics
  - Use "quote" for notable quotes
  - Use "none" if the slide is text/concept focused
- Choose layoutHint that best pairs with the visualIntent:
  - title_slide → title slides only
  - bullets → text-heavy content, no visual
  - chart_with_text → any chart/graph + supporting text
  - two_column → comparisons or pros/cons
  - full_visual → when the visual IS the content
  - big_number → for statistic-focused slides
- Slide count: use the user's preference if given, otherwise 8-12 for most topics
- Make the plan feel like a coherent narrative arc, not a random list`;
```

#### `lib/agents/prompts/content.ts`

```typescript
export const CONTENT_SYSTEM_PROMPT = `You are a presentation content writer.

Given a single slide's plan (purpose + visualIntent + layoutHint), generate the full slide content.

HARD RULES (non-negotiable):
- title: MAX 80 characters
- subtitle: MAX 120 characters (optional)
- bullets: MAX 6 items, each MAX 100 characters
- speakerNotes: MAX 500 characters (optional but encouraged)
- visuals: MAX 3 assets per slide

Content quality rules:
- Bullets should be concise insights, NOT full sentences
- Each bullet should convey exactly ONE idea
- Avoid filler words: "Additionally", "Furthermore", "It is important to note"
- Use active voice
- Include concrete numbers/data when available
- Speaker notes should expand on bullet points, not repeat them

Chart data rules (if visualIntent requires a chart):
- Provide realistic, accurate data
- Labels should be short (max 15 chars)
- Include 3-8 data points (not too sparse, not too crowded)
- Dataset labels should be descriptive`;
```

#### `lib/agents/prompts/compressor.ts`

```typescript
export const COMPRESSOR_SYSTEM_PROMPT = `You are a slide content compressor.

Given a SlideSpec that exceeds constraints, compress it while preserving meaning.

Rules:
- Reduce bullets to max 5 items, each under 80 characters
- Merge overlapping ideas
- Cut filler words aggressively
- Preserve all numerical data and key facts
- Keep the same tone and structure
- Do NOT add new information — only compress existing content`;
```

### 3.2 — Agent Step Modules

Each step is a function: **input → validated output**.

#### `lib/agents/intake.ts` — Step A

```typescript
// lib/agents/intake.ts
import { generateStructuredWithRetry } from "../gemini";
import { ProjectSpecSchema } from "../schemas";
import { ProjectSpec } from "../types";
import { INTAKE_SYSTEM_PROMPT } from "./prompts/intake";

export async function runIntake(userPrompt: string): Promise<ProjectSpec> {
  return generateStructuredWithRetry({
    prompt: userPrompt,
    systemPrompt: INTAKE_SYSTEM_PROMPT,
    schema: ProjectSpecSchema,
    schemaName: "ProjectSpec",
    temperature: 0.3,  // low temp for extraction tasks
  });
}
```

#### `lib/agents/planner.ts` — Step B

```typescript
// lib/agents/planner.ts
import { generateStructuredWithRetry } from "../gemini";
import { DeckPlanSchema } from "../schemas";
import { DeckPlan, ProjectSpec } from "../types";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner";

export async function runPlanner(projectSpec: ProjectSpec): Promise<DeckPlan> {
  const prompt = `Create a presentation plan for the following project:

Topic: ${projectSpec.topic}
Audience: ${projectSpec.audience}
Style: ${projectSpec.style}
Duration: ${projectSpec.durationMinutes ?? "not specified"} minutes
Preferred slide count: ${projectSpec.slideCountPreference ?? "auto (8-12)"}
Language: ${projectSpec.language}`;

  return generateStructuredWithRetry({
    prompt,
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    schema: DeckPlanSchema,
    schemaName: "DeckPlan",
    temperature: 0.7,
  });
}
```

#### `lib/agents/researcher.ts` — Step C (optional, MVP-lite)

```typescript
// lib/agents/researcher.ts
import { generateText } from "../gemini";
import { DeckPlan } from "../types";

/**
 * MVP: Uses Gemini's built-in knowledge to produce research notes.
 * v2: Will add Google Search grounding / tool use.
 */
export async function runResearch(plan: DeckPlan): Promise<string> {
  const slideTopics = plan.slides.map(
    (s) => `- Slide ${s.slideNumber}: ${s.purpose}`
  ).join("\n");

  const prompt = `I'm creating a presentation titled "${plan.title}".
Here are the planned slides:
${slideTopics}

Provide concise factual notes (key dates, statistics, names, and sources)
that I can reference when writing the slide content. Be specific and accurate.
Format as bullet points grouped by slide number.`;

  return generateText({
    prompt,
    systemPrompt: "You are a research assistant. Provide factual, citation-worthy information.",
    temperature: 0.3,
  });
}
```

#### `lib/agents/slide-generator.ts` — Step D

```typescript
// lib/agents/slide-generator.ts
import { generateStructuredWithRetry } from "../gemini";
import { SlideSpecSchema } from "../schemas";
import { DeckPlan, DeckPlanSlide, SlideSpec } from "../types";
import { CONTENT_SYSTEM_PROMPT } from "./prompts/content";

/**
 * Generates content for a single slide.
 */
async function generateSlide(
  slide: DeckPlanSlide,
  plan: DeckPlan,
  researchNotes: string
): Promise<SlideSpec> {
  const prompt = `Generate content for slide ${slide.slideNumber} of "${plan.title}".

Slide plan:
- Purpose: ${slide.purpose}
- Visual intent: ${slide.visualIntent}
- Layout: ${slide.layoutHint}

Presentation context:
- Total slides: ${plan.slideCount}
- Theme: ${plan.suggestedTheme}

Research notes (use relevant facts):
${researchNotes}`;

  return generateStructuredWithRetry({
    prompt,
    systemPrompt: CONTENT_SYSTEM_PROMPT,
    schema: SlideSpecSchema,
    schemaName: "SlideSpec",
    temperature: 0.7,
  });
}

/**
 * Generates all slides. Runs up to 3 slides in parallel for speed.
 */
export async function runSlideGeneration(
  plan: DeckPlan,
  researchNotes: string,
  onProgress?: (slideNum: number, total: number) => void
): Promise<SlideSpec[]> {
  const slides: SlideSpec[] = [];
  const BATCH_SIZE = 3;  // parallel limit to avoid rate limits

  for (let i = 0; i < plan.slides.length; i += BATCH_SIZE) {
    const batch = plan.slides.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((slide) => generateSlide(slide, plan, researchNotes))
    );
    slides.push(...results);

    // Report progress
    results.forEach((_, idx) => {
      onProgress?.(i + idx + 1, plan.slides.length);
    });
  }

  // Sort by slide number to ensure order
  return slides.sort((a, b) => a.slideNumber - b.slideNumber);
}
```

#### `lib/agents/asset-pipeline.ts` — Step E

```typescript
// lib/agents/asset-pipeline.ts
import { SlideSpec, AssetSpec } from "../types";

/**
 * Converts our simplified chart AssetSpec into a full Vega-Lite spec.
 * This is DETERMINISTIC — no LLM involved.
 */
function chartToVegaLite(asset: Extract<AssetSpec, { type: "chart" }>): Record<string, any> {
  // If the LLM already provided a full vegaLiteSpec, use it
  if (asset.vegaLiteSpec) return asset.vegaLiteSpec;

  const { chartType, title, data } = asset;

  // Build base spec from our simplified data format
  const values = data.labels.flatMap((label, i) =>
    data.datasets.map((ds) => ({
      category: label,
      value: ds.values[i],
      series: ds.label,
    }))
  );

  const markType: Record<string, string> = {
    bar: "bar",
    line: "line",
    pie: "arc",
    area: "area",
    timeline: "point",
  };

  if (chartType === "pie") {
    return {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      title,
      data: { values },
      mark: { type: "arc", tooltip: true },
      encoding: {
        theta: { field: "value", type: "quantitative", stack: true },
        color: { field: "category", type: "nominal" },
      },
    };
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title,
    data: { values },
    mark: { type: markType[chartType] || "bar", tooltip: true },
    encoding: {
      x: { field: "category", type: "nominal", title: null },
      y: { field: "value", type: "quantitative", title: null },
      color: data.datasets.length > 1
        ? { field: "series", type: "nominal" }
        : undefined,
    },
  };
}

/**
 * Process all asset specs in all slides.
 * - Charts: convert to Vega-Lite specs
 * - Images: resolve URLs (MVP: Unsplash)  
 * - Tables/BigNumbers: pass through as-is
 */
export async function runAssetPipeline(slides: SlideSpec[]): Promise<SlideSpec[]> {
  return slides.map((slide) => ({
    ...slide,
    visuals: slide.visuals.map((asset) => {
      if (asset.type === "chart") {
        return { ...asset, vegaLiteSpec: chartToVegaLite(asset) };
      }
      if (asset.type === "image" && !asset.url) {
        // MVP: Use Unsplash for free stock images
        return {
          ...asset,
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(asset.query)}`,
        };
      }
      return asset;
    }),
  }));
}
```

#### `lib/agents/qa.ts` — Step F

```typescript
// lib/agents/qa.ts
import { SlideSpecSchema } from "../schemas";
import { SlideSpec } from "../types";
import { generateStructuredWithRetry } from "../gemini";
import { COMPRESSOR_SYSTEM_PROMPT } from "./prompts/compressor";

interface QAResult {
  slides: SlideSpec[];
  issues: string[];
}

/**
 * Validates all slides and compresses any that exceed soft limits.
 */
export async function runQA(slides: SlideSpec[]): Promise<QAResult> {
  const issues: string[] = [];
  const validated: SlideSpec[] = [];

  for (const slide of slides) {
    // 1. Hard validation via Zod
    const parseResult = SlideSpecSchema.safeParse(slide);
    if (!parseResult.success) {
      issues.push(`Slide ${slide.slideNumber}: Schema validation failed — ${parseResult.error.message}`);
      // Attempt to fix by re-generation would go here in production
      validated.push(slide); // pass through for MVP
      continue;
    }

    // 2. Soft limit checks — trigger compression
    const needsCompression =
      slide.bullets.length > 5 ||
      slide.bullets.some((b) => b.length > 80);

    if (needsCompression) {
      issues.push(`Slide ${slide.slideNumber}: Compressing overcrowded content`);
      try {
        const compressed = await generateStructuredWithRetry({
          prompt: `Compress this slide content:\n${JSON.stringify(slide, null, 2)}`,
          systemPrompt: COMPRESSOR_SYSTEM_PROMPT,
          schema: SlideSpecSchema,
          schemaName: "SlideSpec",
          temperature: 0.3,
        });
        validated.push(compressed);
      } catch {
        validated.push(parseResult.data); // fallback to original
      }
    } else {
      validated.push(parseResult.data);
    }
  }

  return { slides: validated, issues };
}
```

### 3.3 — Orchestrator (DAG Runner)

> **File**: `lib/agents/orchestrator.ts`

Wires all steps together and emits progress events.

```typescript
// lib/agents/orchestrator.ts
import { runIntake } from "./intake";
import { runPlanner } from "./planner";
import { runResearch } from "./researcher";
import { runSlideGeneration } from "./slide-generator";
import { runAssetPipeline } from "./asset-pipeline";
import { runQA } from "./qa";
import { DeckSpec, PipelineProgress, DeckPlan } from "../types";

type ProgressCallback = (progress: PipelineProgress) => void;

function emit(onProgress: ProgressCallback | undefined, step: PipelineProgress["step"], status: PipelineProgress["status"], message: string, detail?: string) {
  onProgress?.({ step, status, message, detail, timestamp: Date.now() });
}

export interface OrchestratorOptions {
  userPrompt: string;
  onProgress?: ProgressCallback;
  /** If provided, skip the planning step and use this pre-approved plan */
  approvedPlan?: DeckPlan;
}

export async function runPipeline(opts: OrchestratorOptions): Promise<DeckSpec> {
  const { userPrompt, onProgress, approvedPlan } = opts;

  // ─── Step A: Intake ───────────────────────────────────────
  emit(onProgress, "intake", "running", "Parsing your prompt...");
  const projectSpec = await runIntake(userPrompt);
  emit(onProgress, "intake", "done", "Requirements extracted");

  // ─── Step B: Planning ─────────────────────────────────────
  let plan: DeckPlan;
  if (approvedPlan) {
    plan = approvedPlan;
    emit(onProgress, "planning", "done", "Using your approved plan");
  } else {
    emit(onProgress, "planning", "running", `Planning ${projectSpec.slideCountPreference ?? "8-12"} slides...`);
    plan = await runPlanner(projectSpec);
    emit(onProgress, "planning", "done", `Planned ${plan.slideCount} slides`);
  }

  // ─── Step C: Research (optional) ──────────────────────────
  emit(onProgress, "research", "running", "Researching key facts...");
  let researchNotes = "";
  try {
    researchNotes = await runResearch(plan);
    emit(onProgress, "research", "done", "Research complete");
  } catch {
    emit(onProgress, "research", "skipped", "Skipped research (non-critical)");
  }

  // ─── Step D: Slide Generation ─────────────────────────────
  emit(onProgress, "generation", "running", "Generating slide content...");
  const rawSlides = await runSlideGeneration(plan, researchNotes, (current, total) => {
    emit(onProgress, "generation", "running", `Generating slides...`, `Slide ${current}/${total}`);
  });
  emit(onProgress, "generation", "done", `Generated ${rawSlides.length} slides`);

  // ─── Step E: Asset Pipeline ───────────────────────────────
  emit(onProgress, "assets", "running", "Processing charts & visuals...");
  const slidesWithAssets = await runAssetPipeline(rawSlides);
  emit(onProgress, "assets", "done", "Assets processed");

  // ─── Step F: QA & Compression ─────────────────────────────
  emit(onProgress, "qa", "running", "Quality check...");
  const { slides: finalSlides, issues } = await runQA(slidesWithAssets);
  emit(onProgress, "qa", "done", issues.length > 0
    ? `QA complete — fixed ${issues.length} issue(s)`
    : "QA complete — all slides valid"
  );

  return {
    projectSpec,
    plan,
    slides: finalSlides,
  };
}
```

### 3.4 — Verify Phase 3

Create a test script to verify the full pipeline:

```bash
# scripts/test-pipeline.ts
import { runPipeline } from "../lib/agents/orchestrator";

async function main() {
  const result = await runPipeline({
    userPrompt: "Create a presentation about climate change for university students",
    onProgress: (p) => console.log(`[${p.step}] ${p.status}: ${p.message} ${p.detail ?? ""}`),
  });

  console.log("\n=== RESULT ===");
  console.log(`Title: ${result.plan.title}`);
  console.log(`Slides: ${result.slides.length}`);
  result.slides.forEach(s => {
    console.log(`  #${s.slideNumber}: ${s.title} (${s.layout}, ${s.visuals.length} visuals)`);
  });
}

main().catch(console.error);
```

```bash
npx tsx scripts/test-pipeline.ts
```

---

## Phase 4 — PPTX Renderer

> **Goal**: Convert `SlideSpec[]` → downloadable `.pptx` file.

> **File**: `lib/renderers/pptx-renderer.ts`

### 4.1 — Layout Mapping Strategy

Each `SlideSpec.layout` maps to a rendering function that places elements on the slide using `pptxgenjs`:

| Layout | Strategy |
|---|---|
| `title_slide` | Centered title + subtitle, large font |
| `bullets` | Title top, bullet list centered |
| `chart_with_text` | Left: bullets (50%), Right: chart image (50%) |
| `two_column` | Split bullets evenly into two columns |
| `full_visual` | Full-bleed image/chart, title as overlay |
| `big_number` | Giant number centered, label beneath |

### 4.2 — Implementation Skeleton

```typescript
// lib/renderers/pptx-renderer.ts
import PptxGenJS from "pptxgenjs";
import { DeckSpec, SlideSpec, ThemeSpec } from "../types";
import { renderChartToPng } from "./chart-renderer";

export async function renderToPptx(
  deckSpec: DeckSpec,
  theme: ThemeSpec
): Promise<Buffer> {
  const pptx = new PptxGenJS();

  // Global settings
  pptx.author = "SlideMaker AI";
  pptx.title = deckSpec.plan.title;
  pptx.layout = "LAYOUT_WIDE"; // 16:9

  // Define master slide with theme colors
  pptx.defineSlideMaster({
    title: "MAIN",
    background: { color: theme.colors.background.replace("#", "") },
  });

  // Render each slide
  for (const slideSpec of deckSpec.slides) {
    const slide = pptx.addSlide({ masterName: "MAIN" });
    await renderSlide(slide, slideSpec, theme);
  }

  // Generate buffer
  const output = await pptx.write({ outputType: "nodebuffer" });
  return output as Buffer;
}

async function renderSlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec
): Promise<void> {
  switch (spec.layout) {
    case "title_slide":
      renderTitleSlide(slide, spec, theme);
      break;
    case "bullets":
      renderBulletSlide(slide, spec, theme);
      break;
    case "chart_with_text":
      await renderChartSlide(slide, spec, theme);
      break;
    case "two_column":
      renderTwoColumnSlide(slide, spec, theme);
      break;
    case "full_visual":
      await renderFullVisualSlide(slide, spec, theme);
      break;
    case "big_number":
      renderBigNumberSlide(slide, spec, theme);
      break;
  }

  // Add speaker notes if present
  if (spec.speakerNotes) {
    slide.addNotes(spec.speakerNotes);
  }
}

function renderTitleSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  slide.addText(spec.title, {
    x: "10%", y: "30%", w: "80%", h: "20%",
    fontSize: 36, bold: true, align: "center",
    color: theme.colors.heading.replace("#", ""),
    fontFace: theme.fonts.heading,
  });

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: "15%", y: "55%", w: "70%", h: "10%",
      fontSize: 18, align: "center",
      color: theme.colors.text.replace("#", ""),
      fontFace: theme.fonts.body,
    });
  }
}

function renderBulletSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  // Title
  slide.addText(spec.title, {
    x: "5%", y: "5%", w: "90%", h: "12%",
    fontSize: 28, bold: true,
    color: theme.colors.heading.replace("#", ""),
    fontFace: theme.fonts.heading,
  });

  // Bullets
  const bulletItems = spec.bullets.map((b) => ({
    text: b,
    options: {
      bullet: { code: "2022" }, // bullet char •
      color: theme.colors.text.replace("#", ""),
      fontSize: 16,
      fontFace: theme.fonts.body,
    },
  }));

  slide.addText(bulletItems, {
    x: "8%", y: "22%", w: "84%", h: "70%",
    valign: "top",
    lineSpacing: 28,
  });
}

// Additional layout renderers follow the same pattern...
// Implement renderChartSlide, renderTwoColumnSlide,
// renderFullVisualSlide, renderBigNumberSlide similarly.
```

### 4.3 — Chart-to-PNG Renderer

> **File**: `lib/renderers/chart-renderer.ts`

```typescript
// lib/renderers/chart-renderer.ts
import * as vega from "vega";
import * as vegaLite from "vega-lite";
import { AssetSpec } from "../types";

/**
 * Renders a Vega-Lite spec to a PNG buffer (for PPTX embedding).
 */
export async function renderChartToPng(
  vegaLiteSpec: Record<string, any>,
  width = 600,
  height = 400
): Promise<Buffer> {
  // Compile Vega-Lite → Vega
  const vegaSpec = vegaLite.compile(vegaLiteSpec).spec;

  // Create Vega runtime view
  const view = new vega.View(vega.parse(vegaSpec), {
    renderer: "none",  // server-side, no DOM
  });
  view.width(width);
  view.height(height);

  // Render to canvas → PNG buffer
  const canvas = await view.toCanvas();
  // @ts-ignore — toBuffer exists on node-canvas
  return canvas.toBuffer("image/png");
}

/**
 * Returns the Vega-Lite spec for a chart asset (for web embedding).
 */
export function getVegaLiteSpec(asset: Extract<AssetSpec, { type: "chart" }>): Record<string, any> {
  if (asset.vegaLiteSpec) return asset.vegaLiteSpec;
  throw new Error("Chart asset missing vegaLiteSpec — run asset pipeline first");
}
```

> **Note**: Server-side Vega rendering needs `canvas` (node-canvas). Install:
> ```bash
> pnpm add canvas
> ```

---

## Phase 5 — API Routes (SSE Streaming)

> **Goal**: Create the backend endpoints that the frontend calls.

### 5.1 — Generation Endpoint (SSE)

> **File**: `app/api/generate/route.ts`

```typescript
// app/api/generate/route.ts
import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/agents/orchestrator";
import { renderToPptx } from "@/lib/renderers/pptx-renderer";
import { getTheme } from "@/lib/themes";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, approvedPlan } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Run the full pipeline with progress streaming
        const deckSpec = await runPipeline({
          userPrompt: prompt,
          approvedPlan,
          onProgress: (progress) => send("progress", progress),
        });

        // Generate a unique ID for this deck
        const deckId = crypto.randomUUID();

        // Save DeckSpec for the web viewer
        const outputDir = join(process.cwd(), "output", deckId);
        await mkdir(outputDir, { recursive: true });
        await writeFile(
          join(outputDir, "deck.json"),
          JSON.stringify(deckSpec, null, 2)
        );

        // Render PPTX if requested
        let pptxPath: string | undefined;
        if (deckSpec.projectSpec.output !== "web") {
          send("progress", { step: "rendering", status: "running", message: "Building PPTX...", timestamp: Date.now() });
          const theme = getTheme(deckSpec.plan.suggestedTheme);
          const buffer = await renderToPptx(deckSpec, theme);
          pptxPath = join(outputDir, "presentation.pptx");
          await writeFile(pptxPath, buffer);
          send("progress", { step: "rendering", status: "done", message: "PPTX ready", timestamp: Date.now() });
        }

        // Send completion event
        send("complete", {
          deckId,
          slideCount: deckSpec.slides.length,
          title: deckSpec.plan.title,
          hasPptx: !!pptxPath,
          hasWeb: deckSpec.projectSpec.output !== "pptx",
        });
      } catch (err: any) {
        send("error", { message: err.message });
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
    },
  });
}
```

### 5.2 — PPTX Download Endpoint

> **File**: `app/api/export/route.ts`

```typescript
// app/api/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const deckId = req.nextUrl.searchParams.get("id");
  if (!deckId) {
    return NextResponse.json({ error: "Missing deck ID" }, { status: 400 });
  }

  const pptxPath = join(process.cwd(), "output", deckId, "presentation.pptx");

  try {
    const buffer = await readFile(pptxPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="presentation-${deckId.slice(0, 8)}.pptx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "PPTX not found" }, { status: 404 });
  }
}
```

### 5.3 — Deck Data Endpoint (for web viewer)

> **File**: `app/api/deck/[id]/route.ts`

```typescript
// app/api/deck/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deckPath = join(process.cwd(), "output", id, "deck.json");

  try {
    const data = await readFile(deckPath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
}
```

---

## Phase 6 — Theme System

> **Goal**: Define themes as JSON objects that both renderers consume.

> **File**: `lib/themes.ts`

```typescript
// lib/themes.ts
import { ThemeSpec } from "./types";

export const THEMES: Record<string, ThemeSpec> = {
  "modern-dark": {
    name: "Modern Dark",
    colors: {
      background: "#0f172a",
      surface: "#1e293b",
      text: "#e2e8f0",
      heading: "#f8fafc",
      accent: "#6366f1",
      accentSecondary: "#a78bfa",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 12,
  },
  "minimal-light": {
    name: "Minimal Light",
    colors: {
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#334155",
      heading: "#0f172a",
      accent: "#2563eb",
      accentSecondary: "#7c3aed",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 8,
  },
  corporate: {
    name: "Corporate",
    colors: {
      background: "#f1f5f9",
      surface: "#ffffff",
      text: "#475569",
      heading: "#1e293b",
      accent: "#0369a1",
      accentSecondary: "#0891b2",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 4,
  },
  vibrant: {
    name: "Vibrant",
    colors: {
      background: "#1a1a2e",
      surface: "#16213e",
      text: "#eee8e8",
      heading: "#ffffff",
      accent: "#e94560",
      accentSecondary: "#0f3460",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 16,
  },
};

/**
 * Get a theme by name. Falls back to modern-dark.
 */
export function getTheme(name?: string): ThemeSpec {
  if (!name) return THEMES["modern-dark"];
  // Fuzzy match: "dark" → "modern-dark", "Modern Dark" → "modern-dark"
  const normalized = name.toLowerCase().replace(/\s+/g, "-");
  return THEMES[normalized] ?? THEMES["modern-dark"];
}

/**
 * Convert ThemeSpec → CSS custom properties string (for web renderer).
 */
export function themeToCssVars(theme: ThemeSpec): Record<string, string> {
  return {
    "--slide-bg": theme.colors.background,
    "--slide-surface": theme.colors.surface,
    "--slide-text": theme.colors.text,
    "--slide-heading": theme.colors.heading,
    "--slide-accent": theme.colors.accent,
    "--slide-accent-secondary": theme.colors.accentSecondary,
    "--slide-font-heading": theme.fonts.heading,
    "--slide-font-body": theme.fonts.body,
    "--slide-radius": `${theme.borderRadius}px`,
  };
}
```

---

## Phase 7 — Web Renderer (React Slide Components)

> **Goal**: Build the interactive web presentation viewer.

### 7.1 — Component Architecture

```
components/presentation/
├── slide-renderer.tsx         # Routes SlideSpec → correct slide component
├── slides/
│   ├── title-slide.tsx        # MVP
│   ├── bullet-slide.tsx       # MVP
│   └── chart-slide.tsx        # MVP
├── charts/
│   └── vega-chart.tsx         # Vega-Lite interactive embed
└── presentation-controls.tsx  # Keyboard nav, progress bar, fullscreen
```

### 7.2 — Slide Renderer (Router)

> **File**: `components/presentation/slide-renderer.tsx`

```tsx
"use client";

import { SlideSpec } from "@/lib/types";
import { TitleSlide } from "./slides/title-slide";
import { BulletSlide } from "./slides/bullet-slide";
import { ChartSlide } from "./slides/chart-slide";

interface SlideRendererProps {
  slide: SlideSpec;
  isActive: boolean;
}

export function SlideRenderer({ slide, isActive }: SlideRendererProps) {
  const Component = getSlideComponent(slide.layout);

  return (
    <div
      className="w-full h-full"
      style={{ display: isActive ? "block" : "none" }}
    >
      <Component slide={slide} />
    </div>
  );
}

function getSlideComponent(layout: SlideSpec["layout"]) {
  switch (layout) {
    case "title_slide": return TitleSlide;
    case "bullets": return BulletSlide;
    case "chart_with_text": return ChartSlide;
    // v2 layouts — fallback to bullets for now
    case "two_column":
    case "full_visual":
    case "big_number":
    default:
      return BulletSlide;
  }
}
```

### 7.3 — Example Slide Component (Bullet Slide)

> **File**: `components/presentation/slides/bullet-slide.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";

interface BulletSlideProps {
  slide: SlideSpec;
}

export function BulletSlide({ slide }: BulletSlideProps) {
  return (
    <div className="flex flex-col justify-center h-full px-[10%] py-[8%]">
      <motion.h2
        className="text-4xl font-bold mb-8"
        style={{ color: "var(--slide-heading)", fontFamily: "var(--slide-font-heading)" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {slide.title}
      </motion.h2>

      {slide.subtitle && (
        <motion.p
          className="text-xl mb-6 opacity-70"
          style={{ color: "var(--slide-text)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.2 }}
        >
          {slide.subtitle}
        </motion.p>
      )}

      <ul className="space-y-4">
        {slide.bullets.map((bullet, i) => (
          <motion.li
            key={i}
            className="text-xl flex items-start gap-3"
            style={{ color: "var(--slide-text)", fontFamily: "var(--slide-font-body)" }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          >
            <span
              className="mt-2 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: "var(--slide-accent)" }}
            />
            {bullet}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
```

### 7.4 — Presentation Controls

> **File**: `components/presentation/presentation-controls.tsx`

Handles keyboard navigation (← →), progress bar, slide counter, and fullscreen toggle. Use `useEffect` for keyboard listeners and Framer Motion `AnimatePresence` for slide transitions.

### 7.5 — Web Viewer Page

> **File**: `app/presentation/[id]/page.tsx`

```tsx
// Fetches deck.json from /api/deck/[id]
// Renders slides using SlideRenderer + PresentationControls
// Applies theme CSS variables to the container
// Supports fullscreen mode via Fullscreen API
```

---

## Phase 8 — Builder UI (Frontend Pages)

> **Goal**: Build the user-facing pages: landing prompt input, creation wizard, and result page.

### 8.1 — Page Map

| Route | Page | Components |
|---|---|---|
| `/` | Landing | `PromptInput`, `OutputSelector`, `ThemeSelector` |
| `/create` | Creation wizard | `GenerationProgress`, `PlanPreview` |
| `/presentation/[id]` | Web viewer | `SlideRenderer`, `PresentationControls` |

### 8.2 — Landing Page (`app/page.tsx`)

The main prompt input page with:

- Large, focused `<textarea>` for the prompt (use Shadcn `Textarea`)
- **Output selector**: PPTX / Web / Both toggle (Shadcn `Tabs` or `ToggleGroup`)
- **Theme selector**: Thumbnail cards for each theme
- **Style selector**: Academic / Minimal / Modern / Corporate / Vibrant
- **Generate button** → navigates to `/create` with query params or state

### 8.3 — Creation Page (`app/create/page.tsx`)

1. Receives the prompt + options from the landing page
2. Calls `POST /api/generate` and consumes the SSE stream
3. Displays real-time progress using `GenerationProgress` component
4. When the `planning` step completes, optionally shows `PlanPreview` for user to review/edit the plan before continuing
5. On completion, shows download button (PPTX) and/or "View Presentation" link (Web)

### 8.4 — SSE Client Hook

> **File**: `lib/hooks/use-generation.ts`

```typescript
"use client";

import { useState, useCallback } from "react";
import { PipelineProgress } from "@/lib/types";

interface GenerationState {
  status: "idle" | "generating" | "complete" | "error";
  progress: PipelineProgress[];
  result?: {
    deckId: string;
    title: string;
    slideCount: number;
    hasPptx: boolean;
    hasWeb: boolean;
  };
  error?: string;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: "idle",
    progress: [],
  });

  const generate = useCallback(async (prompt: string, approvedPlan?: any) => {
    setState({ status: "generating", progress: [] });

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, approvedPlan }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "progress") {
            setState((prev) => ({
              ...prev,
              progress: [...prev.progress, data],
            }));
          } else if (currentEvent === "complete") {
            setState((prev) => ({
              ...prev,
              status: "complete",
              result: data,
            }));
          } else if (currentEvent === "error") {
            setState((prev) => ({
              ...prev,
              status: "error",
              error: data.message,
            }));
          }
        }
      }
    }
  }, []);

  return { ...state, generate };
}
```

---

## Phase 9 — Polish & QA

### 9.1 — Debug Mode

Add a `?debug=true` query param to the presentation viewer that shows:

- Raw `SlideSpec` JSON in a side panel
- Step-by-step agent outputs (ProjectSpec → DeckPlan → SlideSpecs)
- Theme CSS variable inspector

### 9.2 — Error Boundaries

- Wrap the SSE consumer in try/catch with user-friendly error messages
- Add `<ErrorBoundary>` around slide components so one broken slide doesn't kill the viewer
- Show a fallback "This slide couldn't be rendered" card

### 9.3 — Performance

- Lazy-load Vega-Lite only when chart slides are present (`dynamic(() => import(...)`)
- Use `React.memo` on slide components (they don't change after generation)
- Add `loading` state skeleton for the web viewer

---

## Phase 10 — Testing Strategy

### Unit Tests

| Module | Test |
|---|---|
| `lib/schemas.ts` | Valid/invalid data passes/fails Zod validation |
| `lib/agents/asset-pipeline.ts` | `chartToVegaLite` produces valid Vega-Lite specs |
| `lib/renderers/chart-renderer.ts` | Renders a chart to PNG without errors |
| `lib/themes.ts` | `getTheme` fuzzy matching works correctly |

### Integration Tests

| Test | Approach |
|---|---|
| Full pipeline | Run `orchestrator.ts` with a test prompt, validate output `DeckSpec` |
| PPTX output | Generate a PPTX, open with a PPTX parser, verify slide count + content |
| SSE endpoint | Call `/api/generate`, consume all events, verify complete event has `deckId` |

### Manual Tests

| Test | What to check |
|---|---|
| Web presentation | Keyboard navigation, transitions, fullscreen, responsive |
| PPTX download | Opens in PowerPoint / Google Slides, charts render, theme applies |
| Error handling | Send an empty prompt, verify graceful error |

---

## Quick-Reference: File Checklist

| # | File | Phase | Status |
|---|---|---|---|
| 1 | `lib/schemas.ts` | 1 | ☐ |
| 2 | `lib/types.ts` | 1 | ☐ |
| 3 | `lib/gemini.ts` | 2 | ☐ |
| 4 | `lib/agents/prompts/intake.ts` | 3 | ☐ |
| 5 | `lib/agents/prompts/planner.ts` | 3 | ☐ |
| 6 | `lib/agents/prompts/content.ts` | 3 | ☐ |
| 7 | `lib/agents/prompts/compressor.ts` | 3 | ☐ |
| 8 | `lib/agents/intake.ts` | 3 | ☐ |
| 9 | `lib/agents/planner.ts` | 3 | ☐ |
| 10 | `lib/agents/researcher.ts` | 3 | ☐ |
| 11 | `lib/agents/slide-generator.ts` | 3 | ☐ |
| 12 | `lib/agents/asset-pipeline.ts` | 3 | ☐ |
| 13 | `lib/agents/qa.ts` | 3 | ☐ |
| 14 | `lib/agents/orchestrator.ts` | 3 | ☐ |
| 15 | `lib/renderers/pptx-renderer.ts` | 4 | ☐ |
| 16 | `lib/renderers/chart-renderer.ts` | 4 | ☐ |
| 17 | `app/api/generate/route.ts` | 5 | ☐ |
| 18 | `app/api/export/route.ts` | 5 | ☐ |
| 19 | `app/api/deck/[id]/route.ts` | 5 | ☐ |
| 20 | `lib/themes.ts` | 6 | ☐ |
| 21 | `components/presentation/slide-renderer.tsx` | 7 | ☐ |
| 22 | `components/presentation/slides/title-slide.tsx` | 7 | ☐ |
| 23 | `components/presentation/slides/bullet-slide.tsx` | 7 | ☐ |
| 24 | `components/presentation/slides/chart-slide.tsx` | 7 | ☐ |
| 25 | `components/presentation/charts/vega-chart.tsx` | 7 | ☐ |
| 26 | `components/presentation/presentation-controls.tsx` | 7 | ☐ |
| 27 | `app/page.tsx` | 8 | ☐ |
| 28 | `app/create/page.tsx` | 8 | ☐ |
| 29 | `app/presentation/[id]/page.tsx` | 8 | ☐ |
| 30 | `lib/hooks/use-generation.ts` | 8 | ☐ |
