import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
});

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || "3", 10);

/**
 * Recursively strip keywords Gemini doesn't support from a JSON Schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanSchemaForGemini(obj: any): any {
  if (Array.isArray(obj)) return obj.map(cleanSchemaForGemini);
  if (obj !== null && typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (["$schema", "additionalProperties", "default", "$ref"].includes(key)) continue;
      cleaned[key] = cleanSchemaForGemini(value);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Call Gemini with structured output enforcement.
 *
 * @param opts.schema - The Zod schema used for VALIDATION of the response.
 * @param opts.useJsonMode - If true, only enables JSON mode (responseMimeType)
 *        WITHOUT sending the schema to Gemini. Use this for complex schemas
 *        that exceed Gemini's nesting depth limit. The schema is described
 *        in the prompt instead, and Zod validates the response.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateStructured<S extends z.ZodType<any, any, any>>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: S;
  schemaName: string;
  model?: string;
  temperature?: number;
  useJsonMode?: boolean;
}): Promise<z.output<S>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, any> = {
    systemInstruction: opts.systemPrompt,
    temperature: opts.temperature ?? 0.7,
    responseMimeType: "application/json",
  };

  // Only attach schema constraint if NOT in json-only mode
  if (!opts.useJsonMode) {
    config.responseJsonSchema = cleanSchemaForGemini(zodToJsonSchema(opts.schema));
  }

  const response = await genai.models.generateContent({
    model: opts.model ?? DEFAULT_MODEL,
    contents: opts.prompt,
    config,
  });

  const text = response.text ?? "{}";
  const parsed = JSON.parse(text);
  return opts.schema.parse(parsed);
}

/**
 * Wrapper with automatic retries on Zod validation failure.
 * Feeds the Zod error back to the model so it can self-correct.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateStructuredWithRetry<S extends z.ZodType<any, any, any>>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: S;
  schemaName: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  useJsonMode?: boolean;
}): Promise<z.output<S>> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prompt = lastError
        ? `${opts.prompt}\n\n---\nPREVIOUS ATTEMPT FAILED VALIDATION:\n${lastError.message}\nPlease fix the output and try again.`
        : opts.prompt;

      return await generateStructured({ ...opts, prompt });
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxRetries) throw lastError;
      console.warn(
        `[Gemini] Attempt ${attempt} failed, retrying...`,
        lastError.message,
      );
    }
  }

  throw lastError;
}

/**
 * Simple unstructured text generation.
 */
export async function generateText(opts: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const response = await genai.models.generateContent({
    model: opts.model ?? DEFAULT_MODEL,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: opts.temperature ?? 0.7,
    },
  });

  return response.text ?? "";
}
