import { SlideSpecSchema } from "../schemas";
import { SlideSpec } from "../types";

export interface QAResult {
  slides: SlideSpec[];
  issues: string[];
}

const MAX_BULLETS = 5;
const MAX_BULLET_LENGTH = 80;

/**
 * Locally compress a slide that exceeds soft limits.
 * No LLM call — just deterministic trimming.
 */
function compressSlide(slide: SlideSpec): SlideSpec {
  let bullets = slide.bullets;

  // Trim each bullet to max length
  bullets = bullets.map((b) =>
    b.length > MAX_BULLET_LENGTH
      ? b.slice(0, MAX_BULLET_LENGTH - 1).trimEnd() + "…"
      : b,
  );

  // Keep only the first MAX_BULLETS items
  if (bullets.length > MAX_BULLETS) {
    bullets = bullets.slice(0, MAX_BULLETS);
  }

  return { ...slide, bullets };
}

/**
 * Validates all slides and compresses any that exceed soft limits.
 * Entirely local — no Gemini API calls.
 */
export async function runQA(slides: SlideSpec[]): Promise<QAResult> {
  const issues: string[] = [];
  const validated: SlideSpec[] = [];
  const schemaFailures: string[] = [];

  for (const slide of slides) {
    // 1. Hard validation via Zod
    const parseResult = SlideSpecSchema.safeParse(slide);
    if (!parseResult.success) {
      schemaFailures.push(
        `Slide ${slide.slideNumber}: Schema validation failed — ${parseResult.error.message}`,
      );
      continue;
    }

    // 2. Soft limit checks — local compression (no API call)
    const needsCompression =
      parseResult.data.bullets.length > MAX_BULLETS ||
      parseResult.data.bullets.some((b) => b.length > MAX_BULLET_LENGTH);

    if (needsCompression) {
      issues.push(
        `Slide ${parseResult.data.slideNumber}: Compressed overcrowded content locally`,
      );
      const compressed = compressSlide(parseResult.data);
      const reparsed = SlideSpecSchema.safeParse(compressed);
      if (!reparsed.success) {
        schemaFailures.push(
          `Slide ${parseResult.data.slideNumber}: Schema validation failed after compression — ${reparsed.error.message}`,
        );
        continue;
      }
      validated.push(reparsed.data);
    } else {
      validated.push(parseResult.data);
    }
  }

  if (schemaFailures.length > 0) {
    throw new Error(
      `QA failed: ${schemaFailures.length} invalid slide(s). ${schemaFailures.join(" | ")}`,
    );
  }

  return { slides: validated, issues };
}
