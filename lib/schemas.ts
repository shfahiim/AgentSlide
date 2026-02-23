import { z } from "zod";

function normalizeWhitespace(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function trimToSentenceOrWord(input: string, maxLen: number) {
  const normalized = normalizeWhitespace(input);
  if (normalized.length <= maxLen) return normalized;

  // Prefer cutting at a sentence boundary within the limit.
  const slice = normalized.slice(0, maxLen);
  const lastStop = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?"),
  );

  if (lastStop >= 20) {
    return slice.slice(0, lastStop + 1).trimEnd();
  }

  // Fall back to last space to avoid mid-word cuts.
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace >= 20) {
    return `${slice.slice(0, lastSpace).trimEnd()}…`;
  }

  return `${slice.trimEnd()}…`;
}

const TitleTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = normalizeWhitespace(value);
  if (!normalized) return value;
  return trimToSentenceOrWord(normalized, 80);
}, z.string().max(80));

const SubtitleTextSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const normalized = normalizeWhitespace(value);
  if (!normalized) return undefined;
  return trimToSentenceOrWord(normalized, 120);
}, z.string().max(120).optional());

const BulletTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = normalizeWhitespace(value);
  if (!normalized) return value;
  return trimToSentenceOrWord(normalized, 100);
}, z.string().max(100));

export const ChartAssetSchema = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "line", "pie", "timeline", "area"]),
  title: z.string().max(80),
  data: z.object({
    labels: z.array(z.string().max(15)).min(3).max(12),
    datasets: z
      .array(
        z.object({
          label: z.string().max(30),
          values: z.array(z.number()),
        }),
      )
      .min(1)
      .max(3),
  }),
  vegaLiteSpec: z.record(z.any()).optional(),
});

export const ChartAssetStrictSchema = ChartAssetSchema.superRefine(
  (asset, ctx) => {
    const labelCount = asset.data.labels.length;
    for (const [idx, ds] of asset.data.datasets.entries()) {
      if (ds.values.length !== labelCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["data", "datasets", idx, "values"],
          message: `Dataset values length (${ds.values.length}) must match labels length (${labelCount})`,
        });
      }
      for (const [vIdx, v] of ds.values.entries()) {
        if (!Number.isFinite(v)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data", "datasets", idx, "values", vIdx],
            message: "Chart values must be finite numbers",
          });
        }
        if (asset.chartType === "pie" && v < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data", "datasets", idx, "values", vIdx],
            message: "Pie chart values must be >= 0",
          });
        }
      }
    }
  },
);

export const ImageAssetSchema = z.object({
  type: z.literal("image"),
  query: z.string(),
  url: z.string().url().optional(),
  alt: z.string(),
  cropMode: z.enum(["fill", "fit", "contain"]).default("fill"),
  /** When images are materialized and saved locally, this is the saved filename under output/<deckId>/assets/. */
  fileName: z.string().max(240).optional(),
  /** e.g. "image/png" */
  mimeType: z.string().max(80).optional(),
  /** Source/provider used to resolve this image. */
  provider: z.enum(["unsplash", "gemini"]).optional(),
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

export const CitationSchema = z.object({
  text: z.string(),
  url: z.string().url().optional(),
  placement: z.enum(["footnote", "speaker_notes", "end_slide"]),
});

export const AUDIENCES = ["high_school", "university", "investors", "general"] as const;
export const STYLES = ["academic", "minimal", "modern", "corporate", "vibrant"] as const;
export const OUTPUTS = ["pptx", "web", "both"] as const;
export const LANGUAGES = ["en", "bn"] as const;
export const CITATION_STYLES = ["footnote", "speaker_notes", "end_slide", "none"] as const;
export const THEME_KEYS = [
  "emerald-modern",
  "ocean-blue",
  "sunset-warm",
  "royal-purple",
  "rose-cream",
  "slate-mono",
  "modern-dark",
  "minimal-light",
  "corporate",
  "vibrant",
] as const;

export const VISUAL_INTENTS = [
  "none",
  "timeline",
  "map",
  "bar_chart",
  "line_chart",
  "pie_chart",
  "photo_grid",
  "quote",
  "comparison_table",
  "infographic",
  "big_number",
] as const;

export const LAYOUTS = [
  "title_slide",
  "bullets",
  "two_column",
  "chart_with_text",
  "full_visual",
  "big_number",
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
  suggestedTheme: z.enum(THEME_KEYS).default("emerald-modern"),
});

export const SlideSpecSchema = z
  .object({
    slideNumber: z.number(),
    title: TitleTextSchema,
    subtitle: SubtitleTextSchema,
    bullets: z.preprocess((value) => {
      if (!Array.isArray(value)) return value;
      return value.slice(0, 6);
    }, z.array(BulletTextSchema).max(6)),
    speakerNotes: z.preprocess((value) => {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== "string") return value;

      const normalized = value.trim().replace(/\s+/g, " ");
      if (!normalized) return undefined;
      if (normalized.length <= 500) return normalized;

      const slice = normalized.slice(0, 499);
      const lastSpace = slice.lastIndexOf(" ");
      const cut = lastSpace > 300 ? slice.slice(0, lastSpace) : slice;
      return `${cut.trimEnd()}…`;
    }, z.string().max(500).optional()),
    layout: z.enum(LAYOUTS),
    visuals: z.array(AssetSpecSchema).max(3),
    citations: z.array(CitationSchema).optional(),
  })
  .superRefine((slide, ctx) => {
    for (const [idx, asset] of slide.visuals.entries()) {
      if (asset.type !== "chart") continue;

      const labelCount = asset.data.labels.length;
      for (const [dsIdx, ds] of asset.data.datasets.entries()) {
        if (ds.values.length !== labelCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["visuals", idx, "data", "datasets", dsIdx, "values"],
            message: `Dataset values length (${ds.values.length}) must match labels length (${labelCount})`,
          });
        }

        for (const [vIdx, v] of ds.values.entries()) {
          if (!Number.isFinite(v)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["visuals", idx, "data", "datasets", dsIdx, "values", vIdx],
              message: "Chart values must be finite numbers",
            });
          }
          if (asset.chartType === "pie" && v < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["visuals", idx, "data", "datasets", dsIdx, "values", vIdx],
              message: "Pie chart values must be >= 0",
            });
          }
        }
      }
    }
  });

export const DeckSpecSchema = z.object({
  projectSpec: ProjectSpecSchema,
  plan: DeckPlanSchema,
  slides: z.array(SlideSpecSchema),
});

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
