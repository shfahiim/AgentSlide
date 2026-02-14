"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";

export function BulletSlide({ slide }: { slide: SlideSpec }) {
  return (
    <section className="h-full w-full flex flex-col justify-center px-[10%] py-[8%]">
      <motion.h2
        className="text-4xl font-bold mb-8"
        style={{
          color: "var(--slide-heading)",
          fontFamily: "var(--slide-font-heading)",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {slide.title}
      </motion.h2>

      {slide.subtitle && (
        <motion.p
          className="text-xl mb-6"
          style={{ color: "var(--slide-text)", opacity: 0.7 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.2 }}
        >
          {slide.subtitle}
        </motion.p>
      )}

      <ul className="space-y-4">
        {slide.bullets.map((bullet, i) => (
          <motion.li
            key={`${slide.slideNumber}-${i}`}
            className="text-xl flex items-start gap-3"
            style={{
              color: "var(--slide-text)",
              fontFamily: "var(--slide-font-body)",
            }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          >
            <span
              className="mt-2 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: "var(--slide-accent)" }}
            />
            {bullet}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
