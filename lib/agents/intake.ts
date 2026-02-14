import { generateStructuredWithRetry } from "../gemini";
import { ProjectSpecSchema } from "../schemas";
import { ProjectSpec } from "../types";
import { INTAKE_SYSTEM_PROMPT } from "./prompts/intake";

export function runIntake(userPrompt: string): Promise<ProjectSpec> {
  return generateStructuredWithRetry({
    prompt: userPrompt,
    systemPrompt: INTAKE_SYSTEM_PROMPT,
    schema: ProjectSpecSchema,
    schemaName: "ProjectSpec",
    temperature: 0.3,
  });
}
