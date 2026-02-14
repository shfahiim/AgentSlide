import { ThemeSpec } from "./types";

export const THEMES: Record<string, ThemeSpec> = {
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
};

export function getTheme(name?: string): ThemeSpec {
  if (!name) return THEMES["modern-dark"];
  const key = name.toLowerCase().replace(/\s+/g, "-");
  return THEMES[key] ?? THEMES["modern-dark"];
}

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
