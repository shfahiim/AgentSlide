import * as vega from "vega";
import * as vegaLite from "vega-lite";
import { AssetSpec } from "../types";

export async function renderChartToPng(vegaLiteSpec: Record<string, unknown>, width = 960, height = 540): Promise<Buffer> {
  const compiled = vegaLite.compile(vegaLiteSpec as never).spec;
  const view = new vega.View(vega.parse(compiled), { renderer: "none" });
  view.width(width).height(height);
  const canvas = await view.toCanvas();
  // @ts-expect-error node-canvas
  return canvas.toBuffer("image/png");
}

export function getVegaLiteSpec(asset: Extract<AssetSpec, { type: "chart" }>): Record<string, unknown> {
  if (!asset.vegaLiteSpec) {
    throw new Error("Chart missing vegaLiteSpec. Run asset pipeline first.");
  }
  return asset.vegaLiteSpec;
}
