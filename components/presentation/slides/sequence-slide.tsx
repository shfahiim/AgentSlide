"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { AccentBadge, SlideHeading, SurfaceCard } from "./layout-primitives";

function getSequenceMeta(layout: SlideSpec["layout"]) {
  switch (layout) {
    case "timeline":
      return { badge: "Timeline", prefix: "Milestone" };
    case "roadmap":
      return { badge: "Roadmap", prefix: "Phase" };
    default:
      return { badge: "Process", prefix: "Step" };
  }
}

export function SequenceSlide({ slide }: { slide: SlideSpec }) {
  const meta = getSequenceMeta(slide.layout);

  return (
    <section className="h-full w-full px-[7%] py-[7%] flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <AccentBadge>{meta.badge}</AccentBadge>
        <div className="mt-4">
          <SlideHeading title={slide.title} subtitle={slide.subtitle} />
        </div>
      </motion.div>

      <div className="flex-1 grid grid-cols-1 gap-4 md:grid-cols-4">
        {slide.bullets.map((bullet, index) => (
          <motion.div
            key={`${slide.slideNumber}-seq-${index}`}
            className="relative"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + index * 0.08, duration: 0.38 }}
          >
            {index < slide.bullets.length - 1 ? (
              <div
                aria-hidden
                className="hidden md:block absolute top-1/2 left-[calc(100%-6px)] h-[2px] w-6 -translate-y-1/2"
                style={{
                  background:
                    "linear-gradient(90deg, var(--slide-accent), color-mix(in srgb, var(--slide-accent) 15%, transparent))",
                }}
              />
            ) : null}
            <SurfaceCard className="h-full p-6">
              <div
                className="size-12 rounded-2xl flex items-center justify-center text-sm font-black"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--slide-accent) 12%, transparent)",
                  color: "var(--slide-accent)",
                  fontFamily: "var(--slide-font-heading)",
                }}
              >
                {index + 1}
              </div>
              <p
                className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--slide-text)", opacity: 0.55 }}
              >
                {meta.prefix} {index + 1}
              </p>
              <p
                className="mt-3 text-lg leading-snug"
                style={{
                  color: "var(--slide-heading)",
                  fontFamily: "var(--slide-font-body)",
                }}
              >
                {bullet}
              </p>
            </SurfaceCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
