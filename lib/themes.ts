import { ThemeSpec } from "./types";

export const THEMES: Record<string, ThemeSpec> = {
  "emerald-modern": {
    name: "Emerald Modern",
    colors: {
      background: "#ffffff",
      surface: "#f9fafb",
      text: "#111827",
      heading: "#064e3b",
      accent: "#10b981",
      accentSecondary: "#34d399",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 16,
  },
  "ocean-blue": {
    name: "Ocean Blue",
    colors: {
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      heading: "#0b3a6b",
      accent: "#0284c7",
      accentSecondary: "#38bdf8",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 14,
  },
  "sunset-warm": {
    name: "Sunset Warm",
    colors: {
      background: "#fff7ed",
      surface: "#ffffff",
      text: "#1f2937",
      heading: "#9a3412",
      accent: "#f97316",
      accentSecondary: "#fb7185",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 16,
  },
  "royal-purple": {
    name: "Royal Purple",
    colors: {
      background: "#faf5ff",
      surface: "#ffffff",
      text: "#1f2937",
      heading: "#4c1d95",
      accent: "#7c3aed",
      accentSecondary: "#a78bfa",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 14,
  },
  "rose-cream": {
    name: "Rose Cream",
    colors: {
      background: "#fff1f2",
      surface: "#ffffff",
      text: "#1f2937",
      heading: "#9f1239",
      accent: "#e11d48",
      accentSecondary: "#fb7185",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 16,
  },
  "slate-mono": {
    name: "Slate Mono",
    colors: {
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      heading: "#0f172a",
      accent: "#334155",
      accentSecondary: "#64748b",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 10,
  },
  "modern-dark": {
    name: "Modern Dark",
    colors: {
      background: "#0f172a",
      surface: "#1e293b",
      text: "#e2e8f0",
      heading: "#f8fafc",
      accent: "#6366f1",
      accentSecondary: "#a78bfa",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 12,
  },
  "minimal-light": {
    name: "Minimal Light",
    colors: {
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#334155",
      heading: "#0f172a",
      accent: "#2563eb",
      accentSecondary: "#7c3aed",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 8,
  },
  corporate: {
    name: "Corporate",
    colors: {
      background: "#f1f5f9",
      surface: "#ffffff",
      text: "#475569",
      heading: "#1e293b",
      accent: "#0369a1",
      accentSecondary: "#0891b2",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 4,
  },
  vibrant: {
    name: "Vibrant",
    colors: {
      background: "#1a1a2e",
      surface: "#16213e",
      text: "#eee8e8",
      heading: "#ffffff",
      accent: "#e94560",
      accentSecondary: "#0f3460",
    },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: 16,
  },
};

/**
 * Get a theme by name. Falls back to emerald-modern.
 */
export function getTheme(name?: string): ThemeSpec {
  if (!name) return THEMES["emerald-modern"];
  // Fuzzy match: "dark" → "modern-dark", "Modern Dark" → "modern-dark"
  const normalized = name.toLowerCase().replace(/\s+/g, "-");
  if (THEMES[normalized]) return THEMES[normalized];

  // Keyword fallback (helps older saved decks with free-text theme names)
  if (normalized.includes("dark")) return THEMES["modern-dark"];
  if (normalized.includes("minimal") || normalized.includes("light")) return THEMES["minimal-light"];
  if (normalized.includes("corporate") || normalized.includes("finance") || normalized.includes("business")) return THEMES["corporate"];
  if (normalized.includes("vibrant") || normalized.includes("neon")) return THEMES["vibrant"];
  if (normalized.includes("purple")) return THEMES["royal-purple"];
  if (normalized.includes("blue") || normalized.includes("ocean")) return THEMES["ocean-blue"];
  if (normalized.includes("sunset") || normalized.includes("warm") || normalized.includes("orange")) return THEMES["sunset-warm"];
  if (normalized.includes("rose") || normalized.includes("pink")) return THEMES["rose-cream"];
  if (normalized.includes("slate") || normalized.includes("mono") || normalized.includes("gray") || normalized.includes("grey")) return THEMES["slate-mono"];
  if (normalized.includes("emerald") || normalized.includes("green")) return THEMES["emerald-modern"];

  return THEMES["emerald-modern"];
}

/**
 * Convert ThemeSpec → CSS custom properties string (for web renderer).
 */
export function themeToCssVars(theme: ThemeSpec): Record<string, string> {
  return {
    "--slide-bg": theme.colors.background,
    "--slide-surface": theme.colors.surface,
    "--slide-text": theme.colors.text,
    "--slide-heading": theme.colors.heading,
    "--slide-accent": theme.colors.accent,
    "--slide-accent-secondary": theme.colors.accentSecondary,
    "--slide-font-heading": theme.fonts.heading,
    "--slide-font-body": theme.fonts.body,
    "--slide-radius": `${theme.borderRadius}px`,
  };
}
