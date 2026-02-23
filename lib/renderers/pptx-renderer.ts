import PptxGenJS from "pptxgenjs";
import { DeckSpec, SlideSpec, ThemeSpec } from "../types";
import { renderChartToPng, getVegaLiteSpec } from "./chart-renderer";
import { join } from "path";
import { traceLog } from "../trace";

function unhash(color: string): string {
  return color.replace("#", "");
}

function toTransparency(alpha: number): number {
  const clamped = Math.max(0, Math.min(1, alpha));
  return Math.round((1 - clamped) * 100);
}

function addTitle(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  slide.addText(spec.title, {
    x: 0.67,
    y: 0.38,
    w: 12.0,
    h: 0.9,
    fontSize: 28,
    bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 0.67,
      y: 1.15,
      w: 12.0,
      h: 0.5,
      fontSize: 16,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });
  }
}

function addCard(
  slide: PptxGenJS.Slide,
  opts: { x: number; y: number; w: number; h: number; theme: ThemeSpec },
) {
  slide.addShape("roundRect", {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fill: { color: unhash(opts.theme.colors.surface) },
    line: { color: unhash(opts.theme.colors.text), transparency: toTransparency(0.12), width: 1 },
  });
}

// ─── Layout-specific renderers ──────────────────────────────────────────

function renderTitleSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  slide.addText(spec.title, {
    x: 1.33, y: 2.25, w: 10.67, h: 1.5,
    fontSize: 36, bold: true, align: "center",
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 2.0, y: 4.13, w: 9.33, h: 0.75,
      fontSize: 18, align: "center",
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });
  }
}

function renderBulletSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  addTitle(slide, spec, theme);

  // Quote-style slide: 1 bullet + subtitle as attribution
  if (spec.subtitle && spec.bullets.length === 1) {
    addCard(slide, { x: 1.0, y: 2.0, w: 11.33, h: 3.7, theme });
    slide.addText(`“${spec.bullets[0]}”`, {
      x: 1.35,
      y: 2.35,
      w: 10.63,
      h: 2.4,
      fontSize: 28,
      bold: true,
      color: unhash(theme.colors.heading),
      fontFace: theme.fonts.body,
      valign: "top",
    });
    slide.addText(`— ${spec.subtitle}`, {
      x: 1.35,
      y: 4.85,
      w: 10.63,
      h: 0.6,
      fontSize: 14,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
      align: "right",
    });
    return;
  }

  // Card grid (2x2) for 2-4 bullets
  if (spec.bullets.length > 0 && spec.bullets.length <= 4) {
    const cards = [
      { x: 0.8, y: 1.9, w: 6.1, h: 2.35 },
      { x: 6.55, y: 1.9, w: 6.1, h: 2.35 },
      { x: 0.8, y: 4.45, w: 6.1, h: 2.35 },
      { x: 6.55, y: 4.45, w: 6.1, h: 2.35 },
    ];

    for (const [idx, bullet] of spec.bullets.entries()) {
      const c = cards[idx];
      if (!c) break;
      addCard(slide, { ...c, theme });
      slide.addShape("roundRect", {
        x: c.x + 0.25,
        y: c.y + 0.25,
        w: 0.5,
        h: 0.5,
        fill: { color: unhash(theme.colors.accent), transparency: toTransparency(0.14) },
        line: { color: unhash(theme.colors.accent), transparency: toTransparency(0.25), width: 1 },
      });
      slide.addText(String(idx + 1), {
        x: c.x + 0.25,
        y: c.y + 0.25,
        w: 0.5,
        h: 0.5,
        fontSize: 14,
        bold: true,
        color: unhash(theme.colors.accent),
        fontFace: theme.fonts.heading,
        align: "center",
        valign: "middle",
      });
      slide.addText(bullet, {
        x: c.x + 0.9,
        y: c.y + 0.25,
        w: c.w - 1.15,
        h: c.h - 0.5,
        fontSize: 16,
        color: unhash(theme.colors.text),
        fontFace: theme.fonts.body,
        valign: "top",
      });
    }
    return;
  }

  // Bullets list fallback
  if (spec.bullets.length > 0) {
    const bulletItems = spec.bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: "2022" as const },
        color: unhash(theme.colors.text),
        fontSize: 16,
        fontFace: theme.fonts.body,
      },
    }));

    slide.addText(bulletItems, {
      x: 1.07,
      y: 1.65,
      w: 11.2,
      h: 5.25,
      valign: "top",
      lineSpacingMultiple: 1.5,
    });
  }
}

async function renderChartSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  addTitle(slide, spec, theme);

  // Left: bullets (50%)
  if (spec.bullets.length > 0) {
    const bulletItems = spec.bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: "2022" as const },
        color: unhash(theme.colors.text),
        fontSize: 14,
        fontFace: theme.fonts.body,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.67, y: 1.65, w: 5.2, h: 5.0,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  }

  // Right: chart image (50%)
  const chart = spec.visuals.find((a) => a.type === "chart");
  if (chart && chart.type === "chart") {
    try {
      // Render at the same aspect ratio as the PPTX placement box to avoid stretching.
      const chartW = 6.4;
      const chartH = 4.0;
      const chartBuffer = await renderChartToPng(getVegaLiteSpec(chart), 1600, 1000, theme);
      addCard(slide, { x: 6.1, y: 1.55, w: 6.7, h: 4.25, theme });
      slide.addImage({
        data: `data:image/png;base64,${chartBuffer.toString("base64")}`,
        x: 6.25, y: 1.65, w: chartW, h: chartH,
      });
    } catch {
      // Chart render failed — add placeholder text
      slide.addText("Chart could not be rendered", {
        x: 6.25, y: 3.0, w: 6.4, h: 1.0,
        fontSize: 14, align: "center",
        color: unhash(theme.colors.text),
      });
    }
  }
}

function renderTwoColumnSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  addTitle(slide, spec, theme);

  const table = spec.visuals.find((a) => a.type === "table");
  if (table && table.type === "table" && table.headers.length > 0) {
    const headerRow = table.headers.map((h) => ({
      text: h,
      options: {
        bold: true,
        color: "FFFFFF",
        fill: { color: unhash(theme.colors.accent) },
        fontFace: theme.fonts.body,
        fontSize: 12,
      },
    }));

    const bodyRows = table.rows.map((row) =>
      row.map((cell) => ({
        text: cell,
        options: {
          color: unhash(theme.colors.text),
          fill: { color: unhash(theme.colors.surface) },
          fontFace: theme.fonts.body,
          fontSize: 12,
        },
      })),
    );

    slide.addTable([headerRow, ...bodyRows], {
      x: 0.67,
      y: 1.65,
      w: 12.0,
      h: 5.4,
      border: { pt: 1, color: "E2E8F0" },
      fontFace: theme.fonts.body,
      margin: 6,
    });
    return;
  }

  // Split bullets evenly into two columns
  const mid = Math.ceil(spec.bullets.length / 2);
  const leftBullets = spec.bullets.slice(0, mid);
  const rightBullets = spec.bullets.slice(mid);

  const makeBulletItems = (bullets: string[]) =>
    bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: "2022" as const },
        color: unhash(theme.colors.text),
        fontSize: 14,
        fontFace: theme.fonts.body,
      },
    }));

  if (leftBullets.length > 0) {
    slide.addText(makeBulletItems(leftBullets), {
      x: 0.67, y: 1.65, w: 5.8, h: 5.0,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  }

  if (rightBullets.length > 0) {
    slide.addText(makeBulletItems(rightBullets), {
      x: 6.8, y: 1.65, w: 5.8, h: 5.0,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  }
}

async function renderFullVisualSlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
  opts?: { assetDir?: string },
) {
  // Full-bleed visual with title overlay
  const image = spec.visuals.find((a) => a.type === "image");
  if (image && image.type === "image" && image.url) {
    try {
      // Prefer locally materialized assets when present; fall back to fetching remote URLs.
      if (image.fileName && opts?.assetDir) {
        const localPath = join(opts.assetDir, image.fileName);
        slide.addImage({ path: localPath, x: 0, y: 0, w: 13.33, h: 7.5 });
      } else if (/^data:image\//i.test(image.url)) {
        slide.addImage({ data: image.url, x: 0, y: 0, w: 13.33, h: 7.5 });
      } else if (/^https?:\/\//i.test(image.url)) {
        const res = await fetch(image.url);
        if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get("content-type") ?? "image/png";
        slide.addImage({
          data: `data:${ct};base64,${buf.toString("base64")}`,
          x: 0,
          y: 0,
          w: 13.33,
          h: 7.5,
        });
      } else {
        slide.addImage({ path: image.url, x: 0, y: 0, w: 13.33, h: 7.5 });
      }
    } catch {
      // ignore
    }
  }

  const chart = spec.visuals.find((a) => a.type === "chart");
  if (chart && chart.type === "chart") {
    try {
      const chartBuffer = await renderChartToPng(getVegaLiteSpec(chart), 1600, 900, theme);
      slide.addImage({
        data: `data:image/png;base64,${chartBuffer.toString("base64")}`,
        x: 0, y: 0, w: 13.33, h: 7.5,
      });
    } catch {
      // fallback
    }
  }

  // Title overlay at bottom (improves readability over images)
  slide.addShape("rect", {
    x: 0,
    y: 5.65,
    w: 13.33,
    h: 1.85,
    fill: { color: "000000", transparency: 45 },
    line: { color: "000000", transparency: 100 },
  });
  slide.addText(spec.title, {
    x: 0.5, y: 5.5, w: 12.33, h: 1.2,
    fontSize: 28, bold: true, align: "center",
    color: "FFFFFF",
    fontFace: theme.fonts.heading,
  });
}

function renderBigNumberSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  // Title
  slide.addText(spec.title, {
    x: 1.0, y: 0.5, w: 11.33, h: 0.8,
    fontSize: 24, bold: true, align: "center",
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });

  // Find big_number asset
  const bigNum = spec.visuals.find((a) => a.type === "big_number");
  if (bigNum && bigNum.type === "big_number") {
    addCard(slide, { x: 1.0, y: 1.6, w: 11.33, h: 5.6, theme });

    // Giant number centered
    slide.addText(bigNum.value, {
      x: 1.0, y: 2.1, w: 11.33, h: 2.5,
      fontSize: 72, bold: true, align: "center",
      color: unhash(theme.colors.accent),
      fontFace: theme.fonts.heading,
    });

    // Label beneath
    slide.addText(bigNum.label, {
      x: 1.0, y: 4.5, w: 11.33, h: 1.0,
      fontSize: 20, align: "center",
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });

    // Context if available
    if (bigNum.context) {
      slide.addText(bigNum.context, {
        x: 2.0, y: 5.5, w: 9.33, h: 0.8,
        fontSize: 14, align: "center",
        color: unhash(theme.colors.text),
        fontFace: theme.fonts.body,
      });
    }
  } else {
    // Fallback: treat as bullet slide
    renderBulletSlide(slide, spec, theme);
  }
}

// ─── Main render function ───────────────────────────────────────────────

async function renderSlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
  opts?: { assetDir?: string },
): Promise<void> {
  switch (spec.layout) {
    case "title_slide":
      renderTitleSlide(slide, spec, theme);
      break;
    case "bullets":
      renderBulletSlide(slide, spec, theme);
      break;
    case "chart_with_text":
      await renderChartSlide(slide, spec, theme);
      break;
    case "two_column":
      renderTwoColumnSlide(slide, spec, theme);
      break;
    case "full_visual":
      await renderFullVisualSlide(slide, spec, theme, opts);
      break;
    case "big_number":
      renderBigNumberSlide(slide, spec, theme);
      break;
    default:
      renderBulletSlide(slide, spec, theme);
      break;
  }

  // Add speaker notes if present
  if (spec.speakerNotes) {
    slide.addNotes(spec.speakerNotes);
  }
}

export async function renderToPptx(
  deckSpec: DeckSpec,
  theme: ThemeSpec,
  opts?: { assetDir?: string },
): Promise<Buffer> {
  const startedAt = Date.now();
  const pptx = new PptxGenJS();

  // Global settings
  pptx.author = "SlideMaker AI";
  pptx.title = deckSpec.plan.title;
  pptx.subject = deckSpec.projectSpec.topic;
  pptx.layout = "LAYOUT_WIDE"; // 16:9

  // Define master slide with theme colors
  pptx.defineSlideMaster({
    title: "MAIN",
    background: { color: unhash(theme.colors.background) },
  });

  traceLog("pptx.render.start", {
    message: "PPTX rendering started",
    data: { slides: deckSpec.slides.length, theme: deckSpec.plan.suggestedTheme },
  });

  // Render each slide
  for (const slideSpec of deckSpec.slides) {
    traceLog("pptx.slide.start", {
      message: `Rendering slide ${slideSpec.slideNumber}`,
      data: { slideNumber: slideSpec.slideNumber, layout: slideSpec.layout },
    });
    const slide = pptx.addSlide({ masterName: "MAIN" });
    await renderSlide(slide, slideSpec, theme, opts);
    traceLog("pptx.slide.done", {
      message: `Rendered slide ${slideSpec.slideNumber}`,
      data: { slideNumber: slideSpec.slideNumber },
    });
  }

  // Generate buffer
  const arrayBuffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  traceLog("pptx.render.done", {
    message: "PPTX rendering finished",
    data: { durationMs: Date.now() - startedAt },
  });
  return Buffer.from(arrayBuffer);
}
