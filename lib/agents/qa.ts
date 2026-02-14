import { generateStructuredWithRetry } from "../gemini";
import { SlideSpecSchema } from "../schemas";
import { SlideSpec } from "../types";
import { COMPRESSOR_SYSTEM_PROMPT } from "./prompts/compressor";

export interface QAResult {
  slides: SlideSpec[];
  issues: string[];
}

async function compressSlide(slide: SlideSpec): Promise<SlideSpec> {
  return generateStructuredWithRetry({
    prompt: JSON.stringify(slide),
    systemPrompt: COMPRESSOR_SYSTEM_PROMPT,
    schema: SlideSpecSchema,
    schemaName: "SlideSpec",
    temperature: 0.2,
  });
}

export async function runQA(slides: SlideSpec[]): Promise<QAResult> {
  const issues: string[] = [];
  const corrected: SlideSpec[] = [];

  for (const slide of slides) {
    let candidate = SlideSpecSchema.parse(slide);
    const needsCompression = candidate.bullets.length > 5 || candidate.bullets.some((b) => b.length > 80);
    if (needsCompression) {
      issues.push(`Slide ${candidate.slideNumber}: compressed for soft limits`);
      candidate = await compressSlide(candidate);
    }
    corrected.push(candidate);
  }

  return { slides: corrected, issues };
}
