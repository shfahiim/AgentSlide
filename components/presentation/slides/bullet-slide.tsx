"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";

export function BulletSlide({ slide }: { slide: SlideSpec }) {
  const isQuote = slide.bullets.length === 1 && !!slide.subtitle;

  if (isQuote) {
    return (
      <section className="h-full w-full flex flex-col justify-center px-[10%] py-[8%]">
        <motion.h2
          className="text-4xl font-bold mb-10"
          style={{
            color: "var(--slide-heading)",
            fontFamily: "var(--slide-font-heading)",
          }}
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {slide.title}
        </motion.h2>

        <motion.div
          className="rounded-[32px] border p-10 relative overflow-hidden"
          style={{
            borderColor: "color-mix(in srgb, var(--slide-text) 10%, transparent)",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--slide-accent) 10%, white 90%) 0%, color-mix(in srgb, var(--slide-surface) 70%, white 30%) 55%, var(--slide-surface) 100%)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.10)",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <div
            aria-hidden
            className="absolute -right-16 -top-16 size-64 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--slide-accent) 30%, transparent) 0%, transparent 65%)",
            }}
          />
          <div className="relative">
            <p
              className="text-3xl leading-snug font-semibold"
              style={{
                color: "var(--slide-heading)",
                fontFamily: "var(--slide-font-body)",
              }}
            >
              “{slide.bullets[0]}”
            </p>
            <p
              className="mt-6 text-base font-medium"
              style={{ color: "var(--slide-text)", opacity: 0.75 }}
            >
              — {slide.subtitle}
            </p>
          </div>
        </motion.div>
      </section>
    );
  }

  const useGrid = slide.bullets.length > 0 && slide.bullets.length <= 4;

  return (
    <section className="h-full w-full flex flex-col justify-center px-[10%] py-[8%]">
      <motion.h2
        className="text-4xl font-bold mb-6"
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
          className="text-xl mb-8"
          style={{ color: "var(--slide-text)", opacity: 0.7 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.2 }}
        >
          {slide.subtitle}
        </motion.p>
      )}

      {useGrid ? (
        <div className="grid grid-cols-2 gap-5">
          {slide.bullets.map((bullet, i) => (
            <motion.div
              key={`${slide.slideNumber}-card-${i}`}
              className="rounded-[28px] border p-6 relative overflow-hidden"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--slide-surface) 72%, white 28%) 0%, var(--slide-surface) 100%)",
                boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="size-10 rounded-2xl flex items-center justify-center font-bold"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--slide-accent) 12%, transparent)",
                    color: "var(--slide-accent)",
                    fontFamily: "var(--slide-font-heading)",
                  }}
                >
                  {i + 1}
                </div>
                <p
                  className="text-lg font-medium leading-snug"
                  style={{
                    color: "var(--slide-text)",
                    fontFamily: "var(--slide-font-body)",
                  }}
                >
                  {bullet}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {slide.bullets.map((bullet, i) => (
            <motion.div
              key={`${slide.slideNumber}-row-${i}`}
              className="rounded-2xl border px-5 py-4 flex items-start gap-3"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--slide-surface) 70%, white 30%)",
              }}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.35 }}
            >
              <span
                className="mt-2 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "var(--slide-accent)" }}
              />
              <p
                className="text-lg"
                style={{
                  color: "var(--slide-text)",
                  fontFamily: "var(--slide-font-body)",
                }}
              >
                {bullet}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
