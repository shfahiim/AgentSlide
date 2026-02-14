import { generateStructuredWithRetry } from "../gemini";
import { DeckPlanSchema } from "../schemas";
import { DeckPlan, ProjectSpec } from "../types";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner";

const TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE_PLANNING || "0.7");

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
    temperature: TEMPERATURE,
  });
}
