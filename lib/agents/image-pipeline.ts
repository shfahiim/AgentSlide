import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { GoogleGenAI } from "@google/genai";
import type { DeckSpec, SlideSpec } from "../types";
import { previewText, traceLog } from "../trace";

export type ImageProvider = "unsplash" | "gemini";

export interface ImagePipelineProgress {
  total: number;
  done: number;
  message: string;
  detail?: string;
}

export interface RunImagePipelineOptions {
  deckId: string;
  outputDir: string;
  deckSpec: DeckSpec;
  /**
   * Default: env `SLIDEMAKER_IMAGE_PROVIDER` or "gemini".
   * Use "gemini" to generate and persist images for both web + PPTX.
   */
  provider?: ImageProvider;
  /** Default: env `GEMINI_IMAGE_MODEL` or "gemini-2.5-flash-image". */
  model?: string;
  /** Default: env `GEMINI_IMAGE_CONCURRENCY` or 2. */
  concurrency?: number;
  /** Default: env `GEMINI_IMAGE_MIN_DELAY_MS` or 60000. */
  minDelayMs?: number;
  /** Default: env `GEMINI_IMAGE_MAX_PER_DECK` or 3. */
  maxImagesPerDeck?: number;
  /** Default: env `SLIDEMAKER_IMAGE_STRICT` or false. If true, any image failure aborts generation. */
  strict?: boolean;
  onProgress?: (p: ImagePipelineProgress) => void;
}

function safeFileName(input: string) {
  // Keep filenames short and safe for URLs and filesystem.
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

function mimeToExt(mimeType: string) {
  const mt = mimeType.toLowerCase();
  if (mt.includes("png")) return ".png";
  if (mt.includes("webp")) return ".webp";
  if (mt.includes("jpeg") || mt.includes("jpg")) return ".jpg";
  return ".png";
}

function buildImagePrompt(opts: {
  deckSpec: DeckSpec;
  slide: SlideSpec;
  query: string;
}) {
  const { deckSpec, slide, query } = opts;
  const bullets = slide.bullets.slice(0, 6).map((b) => `- ${b}`).join("\n");

  // Goal: high-quality slide-safe image, avoid text/logos/watermarks.
  return `Create a high-quality, presentation-ready image for a 16:9 slide.

Topic: ${deckSpec.projectSpec.topic}
Slide title: ${slide.title}
Slide subtitle: ${slide.subtitle ?? "(none)"}
Visual request: ${query}
Key points:
${bullets || "(none)"}

Style rules:
- No text, no captions, no watermarks, no logos, no UI elements.
- Clean, modern, editorial look with strong composition.
- Leave some negative space for a title overlay near the bottom.
- Avoid controversial or unsafe content.`;
}

async function generateGeminiImage(opts: {
  model: string;
  prompt: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });
  const startedAt = Date.now();

  traceLog("image.call.start", {
    message: "Gemini image generation request",
    data: { model: opts.model, promptPreview: previewText(opts.prompt, 700) },
  });

  try {
    const response = await ai.models.generateContent({
      model: opts.model,
      contents: opts.prompt,
      // Prefer multimodal output when supported.
      config: {
        // @google/genai supports this for image models; if the model ignores it, it should still work.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseModalities: ["TEXT", "IMAGE"] as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageConfig: { aspectRatio: "16:9", imageSize: "2K" } as any,
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const firstText = parts.find((p) => typeof (p as { text?: unknown } | undefined)?.text === "string") as
      | { text?: string }
      | undefined;

    traceLog("image.call.response", {
      message: "Gemini image generation response",
      data: {
        model: opts.model,
        durationMs: Date.now() - startedAt,
        parts: parts.length,
        textPreview: previewText(firstText?.text ?? "", 400),
      },
    });

    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inlineData = (part as any).inlineData as { data?: string; mimeType?: string } | undefined;
      if (!inlineData?.data) continue;
      const mimeType = inlineData.mimeType ?? "image/png";
      return { buffer: Buffer.from(inlineData.data, "base64"), mimeType };
    }

    throw new Error("Image model returned no inline image data.");
  } catch (error) {
    traceLog("image.call.error", {
      level: "warn",
      message: "Gemini image generation failed",
      data: { model: opts.model, durationMs: Date.now() - startedAt, error: (error as Error).message },
    });
    throw error;
  }
}

export async function runImagePipeline(opts: RunImagePipelineOptions): Promise<DeckSpec> {
  const provider: ImageProvider =
    opts.provider ??
    (process.env.SLIDEMAKER_IMAGE_PROVIDER as ImageProvider | undefined) ??
    "gemini";

  const model = opts.model ?? process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const concurrency =
    opts.concurrency ??
    (Number.parseInt(process.env.GEMINI_IMAGE_CONCURRENCY ?? "2", 10) || 2);
  const minDelayMs =
    opts.minDelayMs ??
    (Number.parseInt(process.env.GEMINI_IMAGE_MIN_DELAY_MS ?? "60000", 10) || 60000);
  const maxImagesPerDeck =
    opts.maxImagesPerDeck ??
    (Number.parseInt(process.env.GEMINI_IMAGE_MAX_PER_DECK ?? "3", 10) || 3);
  const strict =
    opts.strict ??
    String(process.env.SLIDEMAKER_IMAGE_STRICT ?? "false").toLowerCase() === "true";

  const assetsDir = join(opts.outputDir, "assets");
  await mkdir(assetsDir, { recursive: true });

  const imageRefs: Array<{ slide: SlideSpec; index: number }> = [];
  for (const slide of opts.deckSpec.slides) {
    slide.visuals.forEach((v, index) => {
      if (v.type === "image") imageRefs.push({ slide, index });
    });
  }

  const total = imageRefs.length;
  let done = 0;
  const emit = (message: string, detail?: string) =>
    opts.onProgress?.({ total, done, message, detail });

  if (total === 0) {
    emit("No images requested");
    return opts.deckSpec;
  }

  emit(
    provider === "gemini" ? "Generating images…" : "Resolving image URLs…",
    `${done}/${total}`,
  );

  traceLog("image.pipeline.start", {
    message: "Image pipeline started",
    data: {
      provider,
      model,
      concurrency,
      strict,
      total,
      minDelayMs,
      maxImagesPerDeck,
      mode: provider === "gemini" ? "sequential" : "bulk",
    },
  });

  const slides = opts.deckSpec.slides.map((s) => ({ ...s, visuals: [...s.visuals] }));

  let generatedWithGemini = 0;
  let lastGeminiCallAt = 0;
  const effectiveConcurrency = provider === "gemini" ? 1 : Math.max(1, Math.min(concurrency, total));
  if (provider === "gemini" && effectiveConcurrency !== concurrency) {
    traceLog("image.pipeline.concurrency_override", {
      level: "warn",
      message: "Gemini image generation forced to sequential mode",
      data: { requestedConcurrency: concurrency, effectiveConcurrency },
    });
  }

  for (const { slide, index } of imageRefs) {
    const slideRef = slides.find((s) => s.slideNumber === slide.slideNumber);
    if (!slideRef) continue;
    const asset = slideRef.visuals[index];
    if (!asset || asset.type !== "image") continue;

    const query = asset.query?.trim() || slideRef.title;

    try {
      traceLog("image.asset.start", {
        message: `Slide ${slideRef.slideNumber} image ${index}`,
        data: { slideNumber: slideRef.slideNumber, visualIndex: index, provider, query: previewText(query, 120) },
      });

      if (provider === "gemini") {
        if (generatedWithGemini >= maxImagesPerDeck) {
          slideRef.visuals[index] = {
            ...asset,
            provider: "unsplash",
            url: `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`,
          };
          traceLog("image.asset.capped", {
            level: "warn",
            message: `Slide ${slideRef.slideNumber} image skipped due to deck cap`,
            data: { slideNumber: slideRef.slideNumber, visualIndex: index, maxImagesPerDeck },
          });
        } else {
          const now = Date.now();
          const elapsed = now - lastGeminiCallAt;
          if (lastGeminiCallAt > 0 && elapsed < minDelayMs) {
            const waitMs = minDelayMs - elapsed;
            traceLog("image.call.wait", {
              message: "Waiting before next Gemini image call",
              data: { waitMs, minDelayMs, slideNumber: slideRef.slideNumber, visualIndex: index },
            });
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          }

          lastGeminiCallAt = Date.now();
          const prompt = buildImagePrompt({ deckSpec: opts.deckSpec, slide: slideRef, query });
          const { buffer, mimeType } = await generateGeminiImage({ model, prompt });
          const ext = mimeToExt(mimeType);
          const base = safeFileName(
            `img-s${slideRef.slideNumber}-${index}-${Date.now()}${ext}`,
          );
          const fileName = extname(base) ? base : `${base}${ext}`;
          await writeFile(join(assetsDir, fileName), buffer);

          slideRef.visuals[index] = {
            ...asset,
            provider: "gemini",
            mimeType,
            fileName,
            // Serve via API so the web deck can access it.
            url: `/api/assets/${opts.deckId}/${encodeURIComponent(fileName)}`,
          };
          generatedWithGemini += 1;

          traceLog("image.asset.done", {
            message: `Slide ${slideRef.slideNumber} image saved`,
            data: {
              slideNumber: slideRef.slideNumber,
              visualIndex: index,
              fileName,
              mimeType,
              bytes: buffer.byteLength,
              generatedWithGemini,
              maxImagesPerDeck,
            },
          });
        }
      } else {
        slideRef.visuals[index] = {
          ...asset,
          provider: "unsplash",
          url: asset.url ?? `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`,
        };

        traceLog("image.asset.done", {
          message: `Slide ${slideRef.slideNumber} image URL resolved`,
          data: { slideNumber: slideRef.slideNumber, visualIndex: index, provider: "unsplash" },
        });
      }
    } catch (e) {
      if (strict) throw e;
      // Graceful degradation: fall back to Unsplash so the deck still renders.
      slideRef.visuals[index] = {
        ...asset,
        provider: "unsplash",
        url: `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`,
      };

      traceLog("image.asset.fallback", {
        level: "warn",
        message: `Slide ${slideRef.slideNumber} image fell back to Unsplash`,
        data: { slideNumber: slideRef.slideNumber, visualIndex: index, error: (e as Error).message },
      });
    } finally {
      done += 1;
      emit(
        provider === "gemini" ? "Generating images…" : "Resolving image URLs…",
        `${done}/${total}`,
      );
    }
  }
  emit("Images ready", `${done}/${total}`);

  traceLog("image.pipeline.done", {
    message: "Image pipeline complete",
    data: { provider, total, done, generatedWithGemini, maxImagesPerDeck, minDelayMs },
  });

  return { ...opts.deckSpec, slides };
}
