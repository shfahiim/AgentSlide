import PptxGenJS from "pptxgenjs";
import { ThemeSpec } from "../types";
import { DeckSpec, SlideSpec } from "../types";
import { getVegaLiteSpec, renderChartToPng } from "./chart-renderer";

function unhash(color: string): string {
  return color.replace("#", "");
}

async function renderSlide(pptx: PptxGenJS, spec: SlideSpec, theme: ThemeSpec): Promise<void> {
  const slide = pptx.addSlide();
  slide.background = { color: unhash(theme.colors.background) };

  slide.addText(spec.title, {
    x: 0.6,
    y: 0.3,
    w: 12,
    h: 0.8,
    fontSize: 28,
    bold: true,
    fontFace: theme.fonts.heading,
    color: unhash(theme.colors.heading),
  });

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 0.6,
      y: 1.1,
      w: 12,
      h: 0.6,
      fontSize: 16,
      fontFace: theme.fonts.body,
      color: unhash(theme.colors.text),
    });
  }

  if (spec.bullets.length > 0) {
    slide.addText(
      spec.bullets.map((b) => ({ text: b, options: { bullet: { indent: 14 } } })),
      {
        x: 0.8,
        y: 1.8,
        w: 5.8,
        h: 4.6,
        fontSize: 16,
        color: unhash(theme.colors.text),
        fontFace: theme.fonts.body,
      },
    );
  }

  const chart = spec.visuals.find((asset) => asset.type === "chart");
  if (chart) {
    const chartBuffer = await renderChartToPng(getVegaLiteSpec(chart), 1000, 600);
    slide.addImage({ data: `data:image/png;base64,${chartBuffer.toString("base64")}`, x: 6.6, y: 1.7, w: 5.9, h: 3.6 });
  }

  if (spec.speakerNotes) slide.addNotes(spec.speakerNotes);
}

export async function renderToPptx(deckSpec: DeckSpec, theme: ThemeSpec): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SlideMaker";
  pptx.subject = deckSpec.projectSpec.topic;
  for (const slide of deckSpec.slides) {
    await renderSlide(pptx, slide, theme);
  }
  const arrayBuffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
