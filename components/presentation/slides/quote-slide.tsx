"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { SurfaceCard, SlideHeading } from "./layout-primitives";

export function QuoteSlide({ slide }: { slide: SlideSpec }) {
  return (
    <section className="h-full w-full px-[9%] py-[8%] flex flex-col justify-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.45 }}
      >
        <SurfaceCard className="p-10 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -right-20 -top-20 size-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--slide-accent) 28%, transparent) 0%, transparent 65%)",
            }}
          />
          <div className="relative">
            <p
              className="text-4xl font-semibold leading-snug"
              style={{
                color: "var(--slide-heading)",
                fontFamily: "var(--slide-font-body)",
              }}
            >
              "{slide.bullets[0] ?? slide.subtitle ?? slide.title}"
            </p>
            {slide.subtitle ? (
              <p
                className="mt-8 text-lg font-medium"
                style={{ color: "var(--slide-text)", opacity: 0.75 }}
              >
                {slide.subtitle}
              </p>
            ) : null}
          </div>
        </SurfaceCard>
      </motion.div>
    </section>
  );
}
