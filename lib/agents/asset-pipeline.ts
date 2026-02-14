import { AssetSpec, SlideSpec } from "../types";

function chartToVegaLite(asset: Extract<AssetSpec, { type: "chart" }>): Record<string, unknown> {
  if (asset.vegaLiteSpec) return asset.vegaLiteSpec;

  const values = asset.data.labels.flatMap((label, i) =>
    asset.data.datasets.map((dataset) => ({
      category: label,
      value: dataset.values[i] ?? 0,
      series: dataset.label,
    })),
  );

  if (asset.chartType === "pie") {
    return {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      title: asset.title,
      data: { values },
      mark: { type: "arc", tooltip: true },
      encoding: {
        theta: { field: "value", type: "quantitative" },
        color: { field: "category", type: "nominal" },
      },
    };
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: asset.title,
    data: { values },
    mark: { type: asset.chartType === "timeline" ? "line" : asset.chartType, tooltip: true },
    encoding: {
      x: { field: "category", type: "nominal" },
      y: { field: "value", type: "quantitative" },
      color: asset.data.datasets.length > 1 ? { field: "series", type: "nominal" } : undefined,
    },
  };
}

export async function runAssetPipeline(slides: SlideSpec[]): Promise<SlideSpec[]> {
  return slides.map((slide) => ({
    ...slide,
    visuals: slide.visuals.map((asset) => {
      if (asset.type === "chart") return { ...asset, vegaLiteSpec: chartToVegaLite(asset) };
      if (asset.type === "image" && !asset.url) {
        return {
          ...asset,
          url: `https://source.unsplash.com/1280x720/?${encodeURIComponent(asset.query)}`,
        };
      }
      return asset;
    }),
  }));
}
