import { DeckPlan, DeckSpec, PipelineProgress } from "../types";
import { runAssetPipeline } from "./asset-pipeline";
import { runIntake } from "./intake";
import { runPlanner } from "./planner";
import { runQA } from "./qa";
import { runResearch } from "./researcher";
import { runSlideGeneration } from "./slide-generator";

export interface RunPipelineInput {
  userPrompt: string;
  approvedPlan?: DeckPlan;
  onProgress?: (progress: PipelineProgress) => void;
}

function progress(step: PipelineProgress["step"], status: PipelineProgress["status"], message: string, detail?: string): PipelineProgress {
  return { step, status, message, detail, timestamp: Date.now() };
}

export async function runPipeline(input: RunPipelineInput): Promise<DeckSpec> {
  const emit = input.onProgress ?? (() => undefined);

  emit(progress("intake", "running", "Parsing your prompt"));
  const projectSpec = await runIntake(input.userPrompt);
  emit(progress("intake", "done", "Prompt parsed"));

  let plan: DeckPlan;
  if (input.approvedPlan) {
    plan = input.approvedPlan;
    emit(progress("planning", "skipped", "Using approved plan"));
  } else {
    emit(progress("planning", "running", "Planning deck"));
    plan = await runPlanner(projectSpec);
    emit(progress("planning", "done", "Plan generated"));
  }

  emit(progress("research", "running", "Collecting research notes"));
  const notes = await runResearch(plan);
  emit(progress("research", "done", "Research ready"));

  emit(progress("generation", "running", "Generating slides"));
  const generatedSlides = await runSlideGeneration(plan, notes, (current, total) => {
    emit(progress("generation", "running", "Generating slides", `${current}/${total}`));
  });
  emit(progress("generation", "done", "Slides generated"));

  emit(progress("assets", "running", "Resolving assets"));
  const withAssets = await runAssetPipeline(generatedSlides);
  emit(progress("assets", "done", "Assets resolved"));

  emit(progress("qa", "running", "Running quality checks"));
  const qa = await runQA(withAssets);
  emit(progress("qa", "done", qa.issues.length ? `QA done with ${qa.issues.length} issue(s)` : "QA clean"));

  return {
    projectSpec,
    plan,
    slides: qa.slides,
  };
}
