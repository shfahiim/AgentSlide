import { DeckPlan, DeckSpec, PipelineProgress } from "../types";
import { runAssetPipeline } from "./asset-pipeline";
import { runIntake } from "./intake";
import { runPlanner } from "./planner";
import { runQA } from "./qa";
import { runResearch } from "./researcher";
import { runSlideGeneration } from "./slide-generator";

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

  // ─── Step C: Research (optional — graceful degradation) ───
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
    emit(onProgress, "generation", "running", "Generating slides...", `Slide ${current}/${total}`);
  });
  emit(onProgress, "generation", "done", `Generated ${rawSlides.length} slides`);

  // ─── Step E: Asset Pipeline ───────────────────────────────
  emit(onProgress, "assets", "running", "Processing charts & visuals...");
  const slidesWithAssets = await runAssetPipeline(rawSlides);
  emit(onProgress, "assets", "done", "Assets processed");

  // ─── Step F: QA & Compression ─────────────────────────────
  emit(onProgress, "qa", "running", "Quality check...");
  const { slides: finalSlides, issues } = await runQA(slidesWithAssets);
  emit(
    onProgress,
    "qa",
    "done",
    issues.length > 0
      ? `QA complete — fixed ${issues.length} issue(s)`
      : "QA complete — all slides valid",
  );

  return {
    projectSpec,
    plan,
    slides: finalSlides,
  };
}
