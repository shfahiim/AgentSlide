import { mkdir } from "fs/promises";
import { join } from "path";
import type { DeckSpec, SlideSpec } from "../types";
import { traceLog } from "../trace";

export type ImageProvider = "unsplash";

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
   * Supported provider: "unsplash".
   * If env/request asks for "gemini", we intentionally override to "unsplash".
   */
  provider?: ImageProvider;
  /** Default: env `SLIDEMAKER_IMAGE_STRICT` or false. If true, any image failure aborts generation. */
  strict?: boolean;
  onProgress?: (p: ImagePipelineProgress) => void;
}

function buildSeededFallbackUrl(query: string) {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, "-");
  const seed = encodeURIComponent(normalized || "slidemaker");
  return `https://picsum.photos/seed/${seed}/1600/900`;
}

async function resolveUnsplashUrl(opts: {
  query: string;
  existingUrl?: string;
}): Promise<string> {
  if (opts.existingUrl?.trim()) return opts.existingUrl;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) return buildSeededFallbackUrl(opts.query);

  const endpoint =
    `https://api.unsplash.com/photos/random` +
    `?query=${encodeURIComponent(opts.query)}` +
    `&orientation=landscape&content_filter=high`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
  });
  if (!res.ok) {
    throw new Error(`Unsplash API request failed (${res.status})`);
  }

  const payload = (await res.json()) as {
    urls?: { regular?: string; full?: string; raw?: string };
  };
  const url = payload.urls?.regular ?? payload.urls?.full ?? payload.urls?.raw;
  if (!url) {
    throw new Error("Unsplash API returned no usable image URL");
  }

  return url;
}

export async function runImagePipeline(opts: RunImagePipelineOptions): Promise<DeckSpec> {
  const requestedProvider =
    opts.provider ??
    ((process.env.SLIDEMAKER_IMAGE_PROVIDER as "unsplash" | "gemini" | undefined) ?? "unsplash");
  const provider: ImageProvider = "unsplash";
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

  emit("Resolving image URLs…", `${done}/${total}`);

  traceLog("image.pipeline.start", {
    message: "Image pipeline started",
    data: {
      requestedProvider,
      provider,
      strict,
      total,
    },
  });

  if (requestedProvider !== "unsplash") {
    traceLog("image.pipeline.provider_override", {
      level: "warn",
      message: "Gemini image generation is disabled; using Unsplash resolver instead",
      data: { requestedProvider, effectiveProvider: provider },
    });
  }

  const slides = opts.deckSpec.slides.map((s) => ({ ...s, visuals: [...s.visuals] }));

  for (const { slide, index } of imageRefs) {
    const slideRef = slides.find((s) => s.slideNumber === slide.slideNumber);
    if (!slideRef) continue;
    const asset = slideRef.visuals[index];
    if (!asset || asset.type !== "image") continue;

    const query = asset.query?.trim() || slideRef.title;

    try {
      traceLog("image.asset.start", {
        message: `Slide ${slideRef.slideNumber} image ${index}`,
        data: { slideNumber: slideRef.slideNumber, visualIndex: index, provider, query },
      });

      let resolvedUrl = buildSeededFallbackUrl(query);
      try {
        resolvedUrl = await resolveUnsplashUrl({ query, existingUrl: asset.url });
      } catch (err) {
        traceLog("image.asset.unsplash_error", {
          level: "warn",
          message: `Slide ${slideRef.slideNumber} unsplash lookup failed`,
          data: { slideNumber: slideRef.slideNumber, visualIndex: index, error: (err as Error).message },
        });
      }

      slideRef.visuals[index] = {
        ...asset,
        provider: "unsplash",
        url: resolvedUrl,
      };

      traceLog("image.asset.done", {
        message: `Slide ${slideRef.slideNumber} image URL resolved`,
        data: { slideNumber: slideRef.slideNumber, visualIndex: index, provider: "unsplash" },
      });
    } catch (e) {
      if (strict) throw e;
      // Graceful degradation: fall back to Unsplash so the deck still renders.
      let resolvedUrl = buildSeededFallbackUrl(query);
      try {
        resolvedUrl = await resolveUnsplashUrl({ query, existingUrl: asset.url });
      } catch {
        // Keep seeded fallback URL on lookup failure.
      }

      slideRef.visuals[index] = {
        ...asset,
        provider: "unsplash",
        url: resolvedUrl,
      };

      traceLog("image.asset.fallback", {
        level: "warn",
        message: `Slide ${slideRef.slideNumber} image fell back to Unsplash`,
        data: { slideNumber: slideRef.slideNumber, visualIndex: index, error: (e as Error).message },
      });
    } finally {
      done += 1;
      emit("Resolving image URLs…", `${done}/${total}`);
    }
  }
  emit("Images ready", `${done}/${total}`);

  traceLog("image.pipeline.done", {
    message: "Image pipeline complete",
    data: { requestedProvider, provider, total, done },
  });

  return { ...opts.deckSpec, slides };
}
