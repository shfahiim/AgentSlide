import { generateStructuredWithRetry } from "../gemini";
import { DeckPlanSchema } from "../schemas";
import { DeckPlan, ProjectSpec } from "../types";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner";

export function runPlanner(projectSpec: ProjectSpec): Promise<DeckPlan> {
  const prompt = `Create a DeckPlan for:\n${JSON.stringify(projectSpec, null, 2)}`;
  return generateStructuredWithRetry({
    prompt,
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    schema: DeckPlanSchema,
    schemaName: "DeckPlan",
    temperature: 0.7,
  });
}
