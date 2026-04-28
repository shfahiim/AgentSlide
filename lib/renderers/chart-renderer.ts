import * as vega from "vega";
import * as vegaLite from "vega-lite";
import { AssetSpec, ThemeSpec } from "../types";
import { createVegaThemeConfig } from "../charts/vega-theme";

function applyThemeToVegaLiteSpec(
  spec: Record<string, unknown>,
  theme: ThemeSpec,
): Record<string, unknown> {
  const existingConfig =
    (spec as { config?: Record<string, unknown> }).config ?? {};

  const themedConfig = createVegaThemeConfig({
    text: theme.colors.text,
    heading: theme.colors.heading,
    accent: theme.colors.accent,
    accentSecondary: theme.colors.accentSecondary,
    fontHeading: theme.fonts.heading,
    fontBody: theme.fonts.body,
    radius: theme.borderRadius,
  });

  return {
    ...spec,
    config: {
      ...existingConfig,
      ...themedConfig,
    },
  };
}

export async function renderChartToPng(
  vegaLiteSpec: Record<string, unknown>,
  width = 960,
  height = 540,
  theme?: ThemeSpec,
  scaleFactor = 2,
): Promise<Buffer> {
  const themed = theme ? applyThemeToVegaLiteSpec(vegaLiteSpec, theme) : vegaLiteSpec;
  const compiled = vegaLite.compile(themed as never).spec;
  const view = new vega.View(vega.parse(compiled), { renderer: "none" });
  view.width(width).height(height);
  const canvas = await view.toCanvas(scaleFactor);
  // @ts-expect-error node-canvas
  return canvas.toBuffer("image/png");
}

export function getVegaLiteSpec(asset: Extract<AssetSpec, { type: "chart" }>): Record<string, unknown> {
  if (!asset.vegaLiteSpec) {
    throw new Error("Chart missing vegaLiteSpec. Run asset pipeline first.");
  }
  return asset.vegaLiteSpec;
}
