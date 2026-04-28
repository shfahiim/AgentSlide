"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { AccentBadge } from "./layout-primitives";

export function SectionDividerSlide({ slide }: { slide: SlideSpec }) {
  return (
    <section className="h-full w-full px-[10%] py-[10%] flex flex-col justify-center relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[32%]"
        style={{
          background:
            "radial-gradient(circle at left center, color-mix(in srgb, var(--slide-accent) 20%, transparent) 0%, transparent 72%)",
        }}
      />
      <motion.div
        className="relative max-w-4xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <AccentBadge>Section</AccentBadge>
        <h1
          className="mt-6 text-6xl font-black leading-[0.95] tracking-tight"
          style={{
            color: "var(--slide-heading)",
            fontFamily: "var(--slide-font-heading)",
          }}
        >
          {slide.title}
        </h1>
        {slide.subtitle ? (
          <p
            className="mt-5 max-w-2xl text-2xl"
            style={{
              color: "var(--slide-text)",
              opacity: 0.78,
              fontFamily: "var(--slide-font-body)",
            }}
          >
            {slide.subtitle}
          </p>
        ) : null}
        {slide.bullets.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-3">
            {slide.bullets.map((bullet, index) => (
              <span
                key={`${slide.slideNumber}-divider-${index}`}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--slide-surface) 72%, white 28%)",
                  color: "var(--slide-text)",
                  border: "1px solid color-mix(in srgb, var(--slide-text) 10%, transparent)",
                }}
              >
                {bullet}
              </span>
            ))}
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}
