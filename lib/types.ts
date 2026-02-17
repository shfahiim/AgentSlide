import { z } from "zod";
import {
  AssetSpecSchema,
  CitationSchema,
  DeckPlanSchema,
  DeckPlanSlideSchema,
  DeckSpecSchema,
  ProjectSpecSchema,
  SlideSpecSchema,
  ThemeSpecSchema,
} from "./schemas";

export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
export type DeckPlan = z.infer<typeof DeckPlanSchema>;
export type DeckPlanSlide = z.infer<typeof DeckPlanSlideSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;
export type AssetSpec = z.infer<typeof AssetSpecSchema>;
export type DeckSpec = z.infer<typeof DeckSpecSchema>;
export type ThemeSpec = z.infer<typeof ThemeSpecSchema>;
export type Citation = z.infer<typeof CitationSchema>;

export type OutputMode = "slides" | "webpage" | "knowledge-graph" | "study-yt";

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
  detail?: string;
  timestamp: number;
}

export interface GenerationResult {
  deckSpec: DeckSpec;
  pptxBuffer?: Buffer;
  webDeckId?: string;
}
