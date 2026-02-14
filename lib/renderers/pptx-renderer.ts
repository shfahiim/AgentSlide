import PptxGenJS from "pptxgenjs";
import { DeckSpec, SlideSpec, ThemeSpec } from "../types";
import { renderChartToPng, getVegaLiteSpec } from "./chart-renderer";

function unhash(color: string): string {
  return color.replace("#", "");
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
  // Title
  slide.addText(spec.title, {
    x: 0.67, y: 0.38, w: 12.0, h: 0.9,
    fontSize: 28, bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 0.67, y: 1.15, w: 12.0, h: 0.5,
      fontSize: 16,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });
  }

  // Bullets
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
      x: 1.07, y: 1.65, w: 11.2, h: 5.25,
      valign: "top",
      lineSpacingMultiple: 1.5,
    });
  }
}

async function renderChartSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  // Title
  slide.addText(spec.title, {
    x: 0.67, y: 0.38, w: 12.0, h: 0.9,
    fontSize: 28, bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });

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
  // Title
  slide.addText(spec.title, {
    x: 0.67, y: 0.38, w: 12.0, h: 0.9,
    fontSize: 28, bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });

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

async function renderFullVisualSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  // Full-bleed visual with title overlay
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

  // Title as overlay at bottom
  slide.addText(spec.title, {
    x: 0.5, y: 5.5, w: 12.33, h: 1.2,
    fontSize: 28, bold: true, align: "center",
    color: unhash(theme.colors.heading),
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
    // Giant number centered
    slide.addText(bigNum.value, {
      x: 1.0, y: 2.0, w: 11.33, h: 2.5,
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
      await renderFullVisualSlide(slide, spec, theme);
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
): Promise<Buffer> {
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

  // Render each slide
  for (const slideSpec of deckSpec.slides) {
    const slide = pptx.addSlide({ masterName: "MAIN" });
    await renderSlide(slide, slideSpec, theme);
  }

  // Generate buffer
  const arrayBuffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
