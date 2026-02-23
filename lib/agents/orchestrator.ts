import { DeckPlan, DeckSpec, PipelineProgress } from "../types";
import { runAssetPipeline } from "./asset-pipeline";
import { runIntake } from "./intake";
import { runPlanner } from "./planner";
import { runQA } from "./qa";
import { runResearch } from "./researcher";
import { runSlideGeneration } from "./slide-generator";
import { traceLog } from "../trace";

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
  traceLog("pipeline.step.start", { message: "intake" });
  emit(onProgress, "intake", "running", "Parsing your prompt...");
  const projectSpec = await runIntake(userPrompt);
  emit(onProgress, "intake", "done", "Requirements extracted");
  traceLog("pipeline.step.done", { message: "intake" });

  // ─── Step B: Planning ─────────────────────────────────────
  traceLog("pipeline.step.start", { message: "planning" });
  let plan: DeckPlan;
  if (approvedPlan) {
    plan = approvedPlan;
    emit(onProgress, "planning", "done", "Using your approved plan");
  } else {
    emit(onProgress, "planning", "running", `Planning ${projectSpec.slideCountPreference ?? "8-12"} slides...`);
    plan = await runPlanner(projectSpec);
    emit(onProgress, "planning", "done", `Planned ${plan.slideCount} slides`);
  }
  traceLog("pipeline.step.done", { message: "planning", data: { slideCount: plan.slideCount, theme: plan.suggestedTheme } });

  // After planning, we can deterministically estimate how many assets will exist.
  const expected = plan.slides.reduce(
    (acc, s) => {
      if (s.visualIntent === "bar_chart" || s.visualIntent === "line_chart" || s.visualIntent === "pie_chart" || s.visualIntent === "timeline") {
        acc.charts += 1;
      } else if (s.visualIntent === "big_number") {
        acc.bigNumbers += 1;
      } else if (s.visualIntent === "comparison_table") {
        acc.tables += 1;
      } else if (s.visualIntent === "photo_grid" || s.visualIntent === "infographic" || s.visualIntent === "map") {
        acc.imageSlides += 1;
      }
      return acc;
    },
    { charts: 0, tables: 0, bigNumbers: 0, imageSlides: 0 },
  );
  traceLog("plan.assets.expected", {
    message: "Expected assets from plan",
    data: {
      charts: expected.charts,
      tables: expected.tables,
      bigNumbers: expected.bigNumbers,
      imagesMin: expected.imageSlides,
      imagesMax: expected.imageSlides * 2,
      imageSlides: expected.imageSlides,
    },
  });

  // ─── Step C: Research (async — runs in parallel with generation) ───
  traceLog("pipeline.step.start", { message: "research" });
  emit(onProgress, "research", "running", "Researching key facts...");
  
  // Start research but don't wait for it
  const researchPromise = runResearch(plan)
    .then((notes) => {
      emit(onProgress, "research", "done", "Research complete");
      traceLog("pipeline.step.done", { message: "research", data: { chars: notes.length } });
      return notes;
    })
    .catch(() => {
      emit(onProgress, "research", "skipped", "Skipped research (non-critical)");
      traceLog("pipeline.step.skipped", { level: "warn", message: "research" });
      return ""; // Return empty string on failure
    });

  // ─── Step D: Slide Generation (starts immediately, waits for research) ─────────────
  traceLog("pipeline.step.start", { message: "generation" });
  emit(onProgress, "generation", "running", "Generating slide content...");
  
  // Wait for research to complete before generating slides
  const researchNotes = await researchPromise;
  
  const rawSlides = await runSlideGeneration(plan, researchNotes, (current, total) => {
    emit(onProgress, "generation", "running", "Generating slides...", `Slide ${current}/${total}`);
  });
  emit(onProgress, "generation", "done", `Generated ${rawSlides.length} slides`);
  traceLog("pipeline.step.done", { message: "generation", data: { slides: rawSlides.length } });

  const observed = rawSlides.flatMap((s) => s.visuals).reduce(
    (acc, v) => {
      acc[v.type] = (acc[v.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  traceLog("slides.assets.observed", { message: "Assets present after generation", data: observed });

  // ─── Step E: Asset Pipeline ───────────────────────────────
  traceLog("pipeline.step.start", { message: "assets" });
  emit(onProgress, "assets", "running", "Processing charts & visuals...");
  const slidesWithAssets = await runAssetPipeline(rawSlides);
  emit(onProgress, "assets", "done", "Assets processed");
  traceLog("pipeline.step.done", { message: "assets" });

  // ─── Step F: QA & Compression ─────────────────────────────
  traceLog("pipeline.step.start", { message: "qa" });
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
  traceLog("pipeline.step.done", { message: "qa", data: { issues: issues.length } });

  return {
    projectSpec,
    plan,
    slides: finalSlides,
  };
}
