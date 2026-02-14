export interface VegaThemeInput {
  text: string;
  heading: string;
  accent: string;
  accentSecondary: string;
  fontHeading: string;
  fontBody: string;
  radius: number;
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.trim();
  if (!normalized.startsWith("#")) return normalized;
  const raw = normalized.slice(1);
  if (raw.length !== 6) return normalized;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return `#${raw}${a.toString(16).padStart(2, "0")}`;
}

export function createVegaThemeConfig(input: VegaThemeInput): Record<string, unknown> {
  const { text, heading, accent, accentSecondary, fontHeading, fontBody, radius } = input;

  const softGrid = withAlpha(text, 0.12);
  const softLabel = withAlpha(text, 0.8);
  const softTitle = withAlpha(text, 0.9);

  const corner = Math.max(4, Math.round(radius * 0.5));
  const smallCorner = Math.max(3, Math.round(radius * 0.35));

  return {
    background: "transparent",
    padding: { left: 10, right: 10, top: 6, bottom: 6 },
    title: {
      color: heading,
      font: fontHeading,
      fontSize: 14,
      fontWeight: 700,
      anchor: "start",
      offset: 10,
    },
    axis: {
      domain: false,
      ticks: false,
      tickSize: 0,
      labelColor: softLabel,
      titleColor: softTitle,
      gridColor: softGrid,
      gridDash: [3, 3],
      labelFont: fontBody,
      titleFont: fontBody,
      labelFontSize: 11,
      titleFontSize: 12,
      labelPadding: 8,
      titlePadding: 10,
    },
    axisX: {
      labelAngle: 0,
      labelFlush: true,
      grid: false,
    },
    axisY: {
      grid: true,
    },
    legend: {
      labelColor: softLabel,
      titleColor: softTitle,
      labelFont: fontBody,
      titleFont: fontBody,
      labelFontSize: 11,
      titleFontSize: 12,
      symbolType: "circle",
      symbolSize: 120,
    },
    range: {
      category: [
        accent,
        accentSecondary,
        withAlpha(accent, 0.75),
        withAlpha(accentSecondary, 0.75),
        heading,
      ],
    },
    bar: {
      cornerRadiusTopLeft: corner,
      cornerRadiusTopRight: corner,
    },
    rect: {
      cornerRadius: smallCorner,
    },
    line: {
      strokeWidth: 3,
      strokeCap: "round",
      strokeJoin: "round",
    },
    point: {
      filled: true,
      size: 64,
    },
    area: {
      opacity: 0.18,
    },
    arc: {
      cornerRadius: corner,
      padAngle: 0.02,
    },
    view: { stroke: null },
  };
}

