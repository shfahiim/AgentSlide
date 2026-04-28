import PptxGenJS from "pptxgenjs";
import { DeckSpec, SlideSpec, ThemeSpec } from "../types";
import { renderChartToPng, getVegaLiteSpec } from "./chart-renderer";
import { join } from "path";
import { traceLog } from "../trace";
import { normalizeSlideForRender } from "./slide-safety";

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

function addEyebrow(
  slide: PptxGenJS.Slide,
  text: string,
  x: number,
  y: number,
  theme: ThemeSpec,
) {
  slide.addText(text, {
    x,
    y,
    w: 3.2,
    h: 0.24,
    fontSize: 9,
    bold: true,
    color: unhash(theme.colors.accent),
    fontFace: theme.fonts.heading,
    breakLine: false,
  });
}

function splitBullets(items: string[]) {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)] as const;
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

function renderSectionDividerSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 4.0,
    h: 7.5,
    fill: { color: unhash(theme.colors.accent), transparency: toTransparency(0.92) },
    line: { color: unhash(theme.colors.accent), transparency: 100 },
  });
  addEyebrow(slide, "SECTION", 0.92, 1.25, theme);
  slide.addText(spec.title, {
    x: 0.92,
    y: 1.7,
    w: 8.9,
    h: 1.8,
    fontSize: 30,
    bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });
  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 0.92,
      y: 3.55,
      w: 7.8,
      h: 0.7,
      fontSize: 18,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });
  }
  spec.bullets.slice(0, 3).forEach((bullet, index) => {
    slide.addShape("roundRect", {
      x: 0.92 + index * 2.15,
      y: 4.75,
      w: 1.95,
      h: 0.44,
      fill: { color: unhash(theme.colors.surface) },
      line: { color: unhash(theme.colors.text), transparency: toTransparency(0.14), width: 1 },
    });
    slide.addText(bullet, {
      x: 1.05 + index * 2.15,
      y: 4.87,
      w: 1.7,
      h: 0.18,
      fontSize: 10,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
      align: "center",
    });
  });
}

function renderQuoteSlide(slide: PptxGenJS.Slide, spec: SlideSpec, theme: ThemeSpec) {
  addTitle(slide, spec, theme);
  addCard(slide, { x: 0.95, y: 1.75, w: 11.45, h: 3.95, theme });
  slide.addText(`"${spec.bullets[0] ?? spec.title}"`, {
    x: 1.35,
    y: 2.15,
    w: 10.65,
    h: 2.15,
    fontSize: 24,
    bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.body,
    valign: "middle",
  });
  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 1.35,
      y: 4.65,
      w: 10.65,
      h: 0.42,
      fontSize: 14,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
      align: "right",
    });
  }
}

function renderSequenceFamilySlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
) {
  addTitle(slide, spec, theme);
  const badge =
    spec.layout === "timeline"
      ? "TIMELINE"
      : spec.layout === "roadmap"
        ? "ROADMAP"
        : "PROCESS";
  addEyebrow(slide, badge, 0.67, 1.45, theme);

  const items = spec.bullets.slice(0, 5);
  const count = Math.max(1, items.length);
  const totalWidth = 11.8;
  const gap = 0.2;
  const cardW = Math.min(2.4, (totalWidth - gap * (count - 1)) / count);
  items.forEach((bullet, index) => {
    const x = 0.8 + index * (cardW + gap);
    const y = 2.2;
    if (index < items.length - 1) {
      slide.addShape("line", {
        x: x + cardW,
        y: y + 1.05,
        w: gap,
        h: 0,
        line: { color: unhash(theme.colors.accent), width: 2 },
      });
    }
    addCard(slide, { x, y, w: cardW, h: 2.35, theme });
    slide.addText(String(index + 1), {
      x: x + 0.18,
      y: y + 0.18,
      w: 0.38,
      h: 0.26,
      fontSize: 12,
      bold: true,
      color: unhash(theme.colors.accent),
      fontFace: theme.fonts.heading,
      align: "center",
    });
    slide.addText(bullet, {
      x: x + 0.25,
      y: y + 0.72,
      w: cardW - 0.5,
      h: 1.25,
      fontSize: 14,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
      valign: "middle",
      align: "center",
    });
  });
}

function renderStructuredListSlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
) {
  addTitle(slide, spec, theme);
  const badge =
    spec.layout === "agenda"
      ? "AGENDA"
      : spec.layout === "faq"
        ? "FAQ"
        : spec.layout === "sources"
          ? "SOURCES"
          : "NEXT STEPS";
  addEyebrow(slide, badge, 0.67, 1.45, theme);

  const items = spec.bullets.slice(0, 6);
  const left = items.filter((_, index) => index % 2 === 0);
  const right = items.filter((_, index) => index % 2 === 1);
  [left, right].forEach((column, columnIndex) => {
    column.forEach((bullet, rowIndex) => {
      const x = columnIndex === 0 ? 0.8 : 6.7;
      const y = 2.0 + rowIndex * 1.35;
      const itemNumber = columnIndex === 0 ? rowIndex * 2 + 1 : rowIndex * 2 + 2;
      addCard(slide, { x, y, w: 5.85, h: 1.05, theme });
      slide.addText(`${itemNumber}`.padStart(2, "0"), {
        x: x + 0.18,
        y: y + 0.24,
        w: 0.45,
        h: 0.22,
        fontSize: 10,
        bold: true,
        color: unhash(theme.colors.accent),
        fontFace: theme.fonts.heading,
      });
      slide.addText(bullet, {
        x: x + 0.8,
        y: y + 0.22,
        w: 4.75,
        h: 0.5,
        fontSize: 14,
        color: unhash(theme.colors.text),
        fontFace: theme.fonts.body,
        valign: "middle",
      });
    });
  });
}

function renderComparisonFamilySlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
) {
  addTitle(slide, spec, theme);
  const table = spec.visuals.find((visual) => visual.type === "table");
  if (table && table.type === "table" && table.headers.length > 0) {
    const headerRow = table.headers.map((header) => ({
      text: header,
      options: {
        bold: true,
        color: "FFFFFF",
        fill: { color: unhash(theme.colors.accent) },
        fontFace: theme.fonts.body,
        fontSize: 11,
      },
    }));
    const bodyRows = table.rows.map((row) =>
      row.map((cell) => ({
        text: cell,
        options: {
          color: unhash(theme.colors.text),
          fill: { color: unhash(theme.colors.surface) },
          fontFace: theme.fonts.body,
          fontSize: 11,
        },
      })),
    );
    slide.addTable([headerRow, ...bodyRows], {
      x: 0.67,
      y: 1.7,
      w: 12.0,
      h: 4.9,
      border: { pt: 1, color: "D7DEE5" },
      fontFace: theme.fonts.body,
      margin: 5,
    });
    return;
  }

  if (spec.layout === "case_study") {
    const labels = ["PROBLEM", "SOLUTION", "OUTCOME"];
    spec.bullets.slice(0, 3).forEach((bullet, index) => {
      const x = 0.8 + index * 4.18;
      addCard(slide, { x, y: 2.0, w: 3.75, h: 3.3, theme });
      slide.addText(labels[index] ?? `BLOCK ${index + 1}`, {
        x: x + 0.22,
        y: 2.22,
        w: 1.1,
        h: 0.18,
        fontSize: 9,
        bold: true,
        color: unhash(theme.colors.accent),
        fontFace: theme.fonts.heading,
      });
      slide.addText(bullet, {
        x: x + 0.22,
        y: 2.7,
        w: 3.3,
        h: 1.95,
        fontSize: 16,
        color: unhash(theme.colors.text),
        fontFace: theme.fonts.body,
        valign: "middle",
        align: "center",
      });
    });
    return;
  }

  const [left, right] = splitBullets(spec.bullets.slice(0, 4));
  const labels =
    spec.layout === "pros_cons"
      ? ["PROS", "CONS"]
      : spec.layout === "before_after"
        ? ["BEFORE", "AFTER"]
        : ["OPTION A", "OPTION B"];
  [left, right].forEach((column, columnIndex) => {
    const x = columnIndex === 0 ? 0.8 : 6.75;
    addCard(slide, { x, y: 1.95, w: 5.8, h: 4.8, theme });
    slide.addText(labels[columnIndex] ?? `COLUMN ${columnIndex + 1}`, {
      x: x + 0.25,
      y: 2.18,
      w: 1.4,
      h: 0.18,
      fontSize: 9,
      bold: true,
      color: unhash(theme.colors.accent),
      fontFace: theme.fonts.heading,
    });
    column.forEach((bullet, rowIndex) => {
      slide.addText(`• ${bullet}`, {
        x: x + 0.32,
        y: 2.72 + rowIndex * 0.82,
        w: 5.0,
        h: 0.45,
        fontSize: 14,
        color: unhash(theme.colors.text),
        fontFace: theme.fonts.body,
      });
    });
  });
}

function renderGridFamilySlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
) {
  addTitle(slide, spec, theme);
  const bigNumber = spec.visuals.find((visual) => visual.type === "big_number");
  const items =
    spec.layout === "stat_grid" && bigNumber && bigNumber.type === "big_number"
      ? [`${bigNumber.value} - ${bigNumber.label}`, ...spec.bullets]
      : spec.bullets;
  const labels =
    spec.layout === "swot_matrix"
      ? ["STRENGTHS", "WEAKNESSES", "OPPORTUNITIES", "THREATS"]
      : spec.layout === "team_profiles"
        ? ["PROFILE 1", "PROFILE 2", "PROFILE 3", "PROFILE 4"]
        : ["METRIC 1", "METRIC 2", "METRIC 3", "METRIC 4"];

  items.slice(0, 4).forEach((bullet, index) => {
    const x = index % 2 === 0 ? 0.8 : 6.75;
    const y = index < 2 ? 1.95 : 4.45;
    addCard(slide, { x, y, w: 5.8, h: 2.1, theme });
    slide.addText(labels[index] ?? `CARD ${index + 1}`, {
      x: x + 0.25,
      y: y + 0.24,
      w: 1.8,
      h: 0.18,
      fontSize: 9,
      bold: true,
      color: unhash(theme.colors.accent),
      fontFace: theme.fonts.heading,
    });
    slide.addText(bullet, {
      x: x + 0.25,
      y: y + 0.75,
      w: 5.15,
      h: 0.85,
      fontSize: 16,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
      valign: "middle",
      align: "center",
    });
  });
}

async function renderImageWithCaptionSlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
  opts?: { assetDir?: string },
) {
  const image = spec.visuals.find((visual) => visual.type === "image");
  if (image && image.type === "image" && image.url) {
    try {
      if (image.fileName && opts?.assetDir) {
        slide.addImage({ path: join(opts.assetDir, image.fileName), x: 0.8, y: 1.35, w: 6.15, h: 5.35 });
      } else if (/^data:image\//i.test(image.url)) {
        slide.addImage({ data: image.url, x: 0.8, y: 1.35, w: 6.15, h: 5.35 });
      } else if (/^https?:\/\//i.test(image.url)) {
        const res = await fetch(image.url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const ct = res.headers.get("content-type") ?? "image/png";
          slide.addImage({
            data: `data:${ct};base64,${buf.toString("base64")}`,
            x: 0.8,
            y: 1.35,
            w: 6.15,
            h: 5.35,
          });
        }
      }
    } catch {
      // fall through to text-only framing
    }
  }

  addCard(slide, { x: 7.25, y: 1.35, w: 5.25, h: 5.35, theme });
  slide.addText(spec.title, {
    x: 7.6,
    y: 1.7,
    w: 4.55,
    h: 1.0,
    fontSize: 24,
    bold: true,
    color: unhash(theme.colors.heading),
    fontFace: theme.fonts.heading,
  });
  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 7.6,
      y: 2.65,
      w: 4.35,
      h: 0.55,
      fontSize: 14,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });
  }
  spec.bullets.slice(0, 3).forEach((bullet, index) => {
    slide.addText(`• ${bullet}`, {
      x: 7.6,
      y: 3.45 + index * 0.78,
      w: 4.15,
      h: 0.45,
      fontSize: 14,
      color: unhash(theme.colors.text),
      fontFace: theme.fonts.body,
    });
  });
}

// ─── Main render function ───────────────────────────────────────────────

async function renderSlide(
  slide: PptxGenJS.Slide,
  spec: SlideSpec,
  theme: ThemeSpec,
  opts?: { assetDir?: string },
): Promise<void> {
  const safeSpec = normalizeSlideForRender(spec);

  switch (safeSpec.layout) {
    case "title_slide":
      renderTitleSlide(slide, safeSpec, theme);
      break;
    case "bullets":
      renderBulletSlide(slide, safeSpec, theme);
      break;
    case "chart_with_text":
      await renderChartSlide(slide, safeSpec, theme);
      break;
    case "two_column":
      renderTwoColumnSlide(slide, safeSpec, theme);
      break;
    case "full_visual":
      await renderFullVisualSlide(slide, safeSpec, theme, opts);
      break;
    case "big_number":
      renderBigNumberSlide(slide, safeSpec, theme);
      break;
    case "section_divider":
      renderSectionDividerSlide(slide, safeSpec, theme);
      break;
    case "quote":
      renderQuoteSlide(slide, safeSpec, theme);
      break;
    case "timeline":
    case "roadmap":
    case "process_flow":
      renderSequenceFamilySlide(slide, safeSpec, theme);
      break;
    case "agenda":
    case "faq":
    case "sources":
    case "closing_cta":
      renderStructuredListSlide(slide, safeSpec, theme);
      break;
    case "comparison":
    case "pros_cons":
    case "before_after":
    case "case_study":
    case "risk_register":
      renderComparisonFamilySlide(slide, safeSpec, theme);
      break;
    case "stat_grid":
    case "team_profiles":
    case "swot_matrix":
      renderGridFamilySlide(slide, safeSpec, theme);
      break;
    case "image_with_caption":
      await renderImageWithCaptionSlide(slide, safeSpec, theme, opts);
      break;
    default:
      renderBulletSlide(slide, safeSpec, theme);
      break;
  }

  // Add speaker notes if present
  if (safeSpec.speakerNotes) {
    slide.addNotes(safeSpec.speakerNotes);
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
  pptx.author = "AgentSlide AI";
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
