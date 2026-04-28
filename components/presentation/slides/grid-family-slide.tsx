"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { SlideHeading, SurfaceCard, getPrimaryBigNumber } from "./layout-primitives";

function getLabels(layout: SlideSpec["layout"]) {
  switch (layout) {
    case "swot_matrix":
      return ["Strengths", "Weaknesses", "Opportunities", "Threats"];
    case "team_profiles":
      return ["Profile 1", "Profile 2", "Profile 3", "Profile 4"];
    default:
      return ["Metric 1", "Metric 2", "Metric 3", "Metric 4"];
  }
}

export function GridFamilySlide({ slide }: { slide: SlideSpec }) {
  const labels = getLabels(slide.layout);
  const bigNumber = getPrimaryBigNumber(slide);
  const cards = [...slide.bullets];

  if (bigNumber && slide.layout === "stat_grid") {
    cards.unshift(`${bigNumber.value} - ${bigNumber.label}`);
  }

  return (
    <section className="h-full w-full px-[7%] py-[7%] flex flex-col gap-6">
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="grid flex-1 grid-cols-2 gap-5">
        {cards.slice(0, 4).map((bullet, index) => (
          <motion.div
            key={`${slide.slideNumber}-grid-${index}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + index * 0.06, duration: 0.35 }}
          >
            <SurfaceCard className="h-full p-6">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--slide-text)", opacity: 0.55 }}
              >
                {labels[index] ?? `Card ${index + 1}`}
              </p>
              <p
                className="mt-4 text-xl leading-snug"
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
