import { AssetSpec, SlideSpec } from "../types";

/**
 * Converts our simplified chart AssetSpec into a full Vega-Lite spec.
 * This is DETERMINISTIC — no LLM involved.
 */
function chartToVegaLite(
  asset: Extract<AssetSpec, { type: "chart" }>,
): Record<string, unknown> {
  // If the LLM already provided a full vegaLiteSpec, use it
  if (asset.vegaLiteSpec) return asset.vegaLiteSpec;

  const { chartType, title, data } = asset;

  // Build base spec from our simplified data format
  const values = data.labels.flatMap((label, i) =>
    data.datasets.map((ds) => ({
      category: label,
      value: ds.values[i] ?? 0,
      series: ds.label,
    })),
  );

  const markType: Record<string, string> = {
    bar: "bar",
    line: "line",
    pie: "arc",
    area: "area",
    timeline: "point",
  };

  if (chartType === "pie") {
    return {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      title,
      data: { values },
      mark: { type: "arc", tooltip: true },
      encoding: {
        theta: { field: "value", type: "quantitative", stack: true },
        color: { field: "category", type: "nominal" },
      },
    };
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title,
    data: { values },
    mark: { type: markType[chartType] || "bar", tooltip: true },
    encoding: {
      x: { field: "category", type: "nominal", title: null },
      y: { field: "value", type: "quantitative", title: null },
      color:
        data.datasets.length > 1
          ? { field: "series", type: "nominal" }
          : undefined,
    },
  };
}

/**
 * Process all asset specs in all slides.
 * - Charts: convert to Vega-Lite specs
 * - Images: resolve URLs (MVP: Unsplash)
 * - Tables/BigNumbers: pass through as-is
 */
export async function runAssetPipeline(
  slides: SlideSpec[],
): Promise<SlideSpec[]> {
  return slides.map((slide) => ({
    ...slide,
    visuals: slide.visuals.map((asset) => {
      if (asset.type === "chart") {
        return { ...asset, vegaLiteSpec: chartToVegaLite(asset) };
      }
      if (asset.type === "image" && !asset.url) {
        // MVP: Use Unsplash for free stock images
        return {
          ...asset,
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(asset.query)}`,
        };
      }
      return asset;
    }),
  }));
}
