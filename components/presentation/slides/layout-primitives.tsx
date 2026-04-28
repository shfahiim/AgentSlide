"use client";

import { SlideSpec } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SlideHeading({
  title,
  subtitle,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "text-center")}>
      <h2
        className="text-4xl font-bold tracking-tight"
        style={{
          color: "var(--slide-heading)",
          fontFamily: "var(--slide-font-heading)",
        }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className="mt-2 text-lg"
          style={{
            color: "var(--slide-text)",
            opacity: 0.75,
            fontFamily: "var(--slide-font-body)",
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-[28px] border", className)}
      style={{
        borderColor: "color-mix(in srgb, var(--slide-text) 10%, transparent)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--slide-surface) 74%, white 26%) 0%, var(--slide-surface) 100%)",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
      }}
    >
      {children}
    </div>
  );
}

export function AccentBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em]"
      style={{
        backgroundColor: "color-mix(in srgb, var(--slide-accent) 12%, transparent)",
        color: "var(--slide-accent)",
      }}
    >
      {children}
    </span>
  );
}

export function splitBullets(items: string[]) {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)] as const;
}

export function getPrimaryImage(slide: SlideSpec) {
  const image = slide.visuals.find((visual) => visual.type === "image");
  return image?.type === "image" ? image : null;
}

export function getPrimaryTable(slide: SlideSpec) {
  const table = slide.visuals.find((visual) => visual.type === "table");
  return table?.type === "table" ? table : null;
}

export function getPrimaryBigNumber(slide: SlideSpec) {
  const big = slide.visuals.find((visual) => visual.type === "big_number");
  return big?.type === "big_number" ? big : null;
}
