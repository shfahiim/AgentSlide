"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";

export function TitleSlide({ slide }: { slide: SlideSpec }) {
  return (
    <section className="h-full w-full flex flex-col items-center justify-center text-center px-[10%] py-[8%]">
      <motion.h1
        className="text-6xl font-bold mb-6"
        style={{
          color: "var(--slide-heading)",
          fontFamily: "var(--slide-font-heading)",
        }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {slide.title}
      </motion.h1>

      {slide.subtitle && (
        <motion.p
          className="text-2xl"
          style={{
            color: "var(--slide-text)",
            fontFamily: "var(--slide-font-body)",
            opacity: 0.8,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {slide.subtitle}
        </motion.p>
      )}
    </section>
  );
}
