"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import embed from "vega-embed";
import { createVegaThemeConfig } from "@/lib/charts/vega-theme";

export function VegaChart({ spec }: { spec: Record<string, unknown> }) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const lastViewRef = useRef<{ finalize: () => void } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    if (!outerRef.current) return;

    const el = outerRef.current;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      // Avoid thrash from sub-pixel changes.
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      setSize((prev) => {
        if (prev && prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const themedConfig = useMemo(() => {
    const el = outerRef.current;
    const styles = el ? getComputedStyle(el) : null;

    const read = (name: string, fallback: string) =>
      styles?.getPropertyValue(name).trim() || fallback;

    const text = read("--slide-text", "#111827");
    const heading = read("--slide-heading", "#0f172a");
    const accent = read("--slide-accent", "#2563eb");
    const accentSecondary = read("--slide-accent-secondary", "#7c3aed");
    const fontHeading = read("--slide-font-heading", "Inter");
    const fontBody = read("--slide-font-body", "Inter");
    const radiusStr = read("--slide-radius", "14px");
    const radius = Number.parseInt(radiusStr, 10) || 14;

    return createVegaThemeConfig({
      text,
      heading,
      accent,
      accentSecondary,
      fontHeading,
      fontBody,
      radius,
    });
  }, [size?.width, size?.height]);

  useEffect(() => {
    if (!mountRef.current) return;
    if (!size) return;

    const container = mountRef.current;
    container.innerHTML = "";
    lastViewRef.current?.finalize?.();
    lastViewRef.current = null;

    const run = async () => {
      const mergedSpec = {
        ...(spec as Record<string, unknown>),
        width: size.width,
        height: size.height,
        autosize: { type: "fit", contains: "padding" },
        config: {
          ...((spec as { config?: Record<string, unknown> }).config ?? {}),
          ...themedConfig,
        },
      };

      const result = await embed(container as HTMLElement, mergedSpec as never, {
        actions: false,
        // SVG stays sharp when the parent slide is CSS-scaled for preview/presentation.
        renderer: "svg",
        tooltip: true,
      });

      lastViewRef.current = result.view;
    };
    run().catch(() => undefined);
    return () => {
      lastViewRef.current?.finalize?.();
      lastViewRef.current = null;
    };
  }, [spec, size, themedConfig]);

  return (
    <div ref={outerRef} className="w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
