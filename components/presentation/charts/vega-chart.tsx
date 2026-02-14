"use client";

import { useEffect, useRef } from "react";
import embed from "vega-embed";

export function VegaChart({ spec }: { spec: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const run = async () => {
      await embed(ref.current as HTMLElement, spec as never, {
        actions: false,
        renderer: "canvas",
        tooltip: true,
      });
    };
    run().catch(() => undefined);
  }, [spec]);

  return <div ref={ref} className="w-full h-full" />;
}
