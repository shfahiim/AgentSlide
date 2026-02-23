import { GoogleGenAI } from "@google/genai";
import crypto from "node:crypto";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { previewText, traceLog } from "./trace";

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
  trace?: { attempt?: number; maxRetries?: number; callId?: string };
}): Promise<z.output<S>> {
  const callId = opts.trace?.callId ?? crypto.randomUUID();
  const startedAt = Date.now();
  const model = opts.model ?? DEFAULT_MODEL;

  traceLog("llm.call.start", {
    message: `generateStructured ${opts.schemaName}`,
    data: {
      callId,
      attempt: opts.trace?.attempt,
      maxRetries: opts.trace?.maxRetries,
      model,
      temperature: opts.temperature ?? 0.7,
      useJsonMode: Boolean(opts.useJsonMode),
      systemPreview: previewText(opts.systemPrompt ?? "", 300),
      promptPreview: previewText(opts.prompt, 700),
    },
  });

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

  try {
    const response = await genai.models.generateContent({
      model,
      contents: opts.prompt,
      config,
    });

    const text = response.text ?? "{}";
    traceLog("llm.call.response", {
      message: `generateStructured ${opts.schemaName}`,
      data: {
        callId,
        durationMs: Date.now() - startedAt,
        responseChars: text.length,
        responsePreview: previewText(text, 900),
      },
    });

    const parsed = JSON.parse(text);
    const output = opts.schema.parse(parsed);
    traceLog("llm.call.ok", {
      message: `Validated ${opts.schemaName}`,
      data: { callId, durationMs: Date.now() - startedAt },
    });
    return output;
  } catch (error) {
    traceLog("llm.call.error", {
      level: "warn",
      message: `generateStructured ${opts.schemaName} failed`,
      data: {
        callId,
        durationMs: Date.now() - startedAt,
        error: (error as Error).message,
      },
    });
    throw error;
  }
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
    const callId = crypto.randomUUID();
    try {
      const prompt = lastError
        ? `${opts.prompt}\n\n---\nPREVIOUS ATTEMPT FAILED VALIDATION:\n${lastError.message}\nPlease fix the output and try again.`
        : opts.prompt;

      if (attempt > 1) {
        traceLog("llm.call.retry", {
          level: "warn",
          message: `Retrying ${opts.schemaName}`,
          data: { attempt, maxRetries, lastError: previewText(lastError?.message ?? "", 700) },
        });
      }

      return await generateStructured({
        ...opts,
        prompt,
        trace: { attempt, maxRetries, callId },
      });
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
  const callId = crypto.randomUUID();
  const startedAt = Date.now();
  const model = opts.model ?? DEFAULT_MODEL;

  traceLog("llm.text.start", {
    message: "generateText",
    data: {
      callId,
      model,
      temperature: opts.temperature ?? 0.7,
      systemPreview: previewText(opts.systemPrompt ?? "", 300),
      promptPreview: previewText(opts.prompt, 700),
    },
  });

  try {
    const response = await genai.models.generateContent({
      model,
      contents: opts.prompt,
      config: {
        systemInstruction: opts.systemPrompt,
        temperature: opts.temperature ?? 0.7,
      },
    });

    const text = response.text ?? "";
    traceLog("llm.text.response", {
      message: "generateText",
      data: { callId, durationMs: Date.now() - startedAt, responseChars: text.length, responsePreview: previewText(text, 900) },
    });
    return text;
  } catch (error) {
    traceLog("llm.text.error", {
      level: "warn",
      message: "generateText failed",
      data: { callId, durationMs: Date.now() - startedAt, error: (error as Error).message },
    });
    throw error;
  }
}
