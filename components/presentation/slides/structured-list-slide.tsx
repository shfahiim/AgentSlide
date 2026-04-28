"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { AccentBadge, SlideHeading, SurfaceCard } from "./layout-primitives";

function getMeta(layout: SlideSpec["layout"]) {
  switch (layout) {
    case "agenda":
      return { badge: "Agenda", prefix: "Section" };
    case "faq":
      return { badge: "FAQ", prefix: "Q" };
    case "sources":
      return { badge: "Sources", prefix: "Ref" };
    default:
      return { badge: "Next Steps", prefix: "Action" };
  }
}

export function StructuredListSlide({ slide }: { slide: SlideSpec }) {
  const meta = getMeta(slide.layout);

  return (
    <section className="h-full w-full px-[8%] py-[7%] flex flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slide.bullets.map((bullet, index) => (
          <motion.div
            key={`${slide.slideNumber}-list-${index}`}
            initial={{ opacity: 0, x: index % 2 === 0 ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 + index * 0.06, duration: 0.35 }}
          >
            <SurfaceCard className="p-5 h-full">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
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
