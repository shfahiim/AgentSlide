import { generateStructuredWithRetry } from "../gemini";
import { SlideSpecSchema } from "../schemas";
import { DeckPlan, DeckPlanSlide, SlideSpec } from "../types";
import { CONTENT_SYSTEM_PROMPT } from "./prompts/content";

async function generateSlide(slide: DeckPlanSlide, plan: DeckPlan, researchNotes: string): Promise<SlideSpec> {
  return generateStructuredWithRetry({
    prompt: `Generate slide ${slide.slideNumber} for ${plan.title}.\nPlan:${JSON.stringify(slide)}\nNotes:\n${researchNotes}`,
    systemPrompt: CONTENT_SYSTEM_PROMPT,
    schema: SlideSpecSchema,
    schemaName: "SlideSpec",
  });
}

export async function runSlideGeneration(
  plan: DeckPlan,
  researchNotes: string,
  onProgress?: (slideNum: number, total: number) => void,
): Promise<SlideSpec[]> {
  const out: SlideSpec[] = [];
  for (let i = 0; i < plan.slides.length; i += 1) {
    const result = await generateSlide(plan.slides[i], plan, researchNotes);
    out.push(result);
    onProgress?.(i + 1, plan.slides.length);
  }
  return out.sort((a, b) => a.slideNumber - b.slideNumber);
}
