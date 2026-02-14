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
  return THEMES[normalized] ?? THEMES["emerald-modern"];
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
