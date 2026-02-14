import { z } from "zod";

export const ChartAssetSchema = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "line", "pie", "timeline", "area"]),
  title: z.string(),
  data: z.object({
    labels: z.array(z.string()),
    datasets: z.array(
      z.object({
        label: z.string(),
        values: z.array(z.number()),
      }),
    ),
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
