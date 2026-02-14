import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY ?? "" });
const DEFAULT_MODEL = "gemini-2.5-flash";

export async function generateStructured<T>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodSchema<T>;
  schemaName: string;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const responseSchema = zodToJsonSchema(opts.schema, opts.schemaName);
  const response = await genai.models.generateContent({
    model: opts.model ?? DEFAULT_MODEL,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: opts.temperature ?? 0.7,
      responseMimeType: "application/json",
      responseSchema: responseSchema as object,
    },
  });

  const text = response.text ?? "{}";
  return opts.schema.parse(JSON.parse(text));
}

export async function generateStructuredWithRetry<T>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodSchema<T>;
  schemaName: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const prompt =
        lastError == null
          ? opts.prompt
          : `${opts.prompt}\n\nValidation error from previous attempt:\n${lastError.message}\nReturn corrected JSON only.`;
      return await generateStructured({ ...opts, prompt });
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) throw lastError;
    }
  }

  throw new Error("Unreachable");
}

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
