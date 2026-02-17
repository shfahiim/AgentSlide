"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";

export function BigNumberSlide({ slide }: { slide: SlideSpec }) {
  const bigNum = slide.visuals.find((a) => a.type === "big_number");

  if (!bigNum || bigNum.type !== "big_number") {
    return (
      <section className="h-full w-full flex flex-col justify-center px-[10%] py-[8%]">
        <motion.h2
          className="text-5xl font-bold mb-6"
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
        <p
          className="text-lg"
          style={{ color: "var(--slide-text)", opacity: 0.7 }}
        >
          Missing big-number visual.
        </p>
      </section>
    );
  }

  return (
    <section className="h-full w-full px-[8%] py-[8%] grid grid-cols-5 gap-10 items-center">
      <div className="col-span-2">
        <motion.h2
          className="text-4xl font-bold mb-4"
          style={{
            color: "var(--slide-heading)",
            fontFamily: "var(--slide-font-heading)",
          }}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {slide.title}
        </motion.h2>
        {slide.subtitle ? (
          <motion.p
            className="text-lg"
            style={{
              color: "var(--slide-text)",
              opacity: 0.75,
              fontFamily: "var(--slide-font-body)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            transition={{ delay: 0.15 }}
          >
            {slide.subtitle}
          </motion.p>
        ) : null}

        {slide.bullets.length > 0 ? (
          <div className="mt-8 space-y-3">
            {slide.bullets.slice(0, 4).map((b, i) => (
              <motion.div
                key={`${slide.slideNumber}-bn-${i}`}
                className="px-4 py-3 rounded-2xl border"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                  backgroundColor:
                    "color-mix(in srgb, var(--slide-surface) 75%, white 25%)",
                }}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + i * 0.08, duration: 0.35 }}
              >
                <p
                  className="text-base"
                  style={{
                    color: "var(--slide-text)",
                    fontFamily: "var(--slide-font-body)",
                  }}
                >
                  {b}
                </p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      <motion.div
        className="col-span-3 relative overflow-hidden"
        style={{
          borderRadius: "calc(var(--slide-radius) + 14px)",
          border: "1px solid color-mix(in srgb, var(--slide-text) 10%, transparent)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--slide-accent) 14%, white 86%) 0%, color-mix(in srgb, var(--slide-surface) 65%, white 35%) 60%, var(--slide-surface) 100%)",
          boxShadow:
            "0 24px 60px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          padding: "28px",
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div
          aria-hidden
          className="absolute -right-20 -top-20 size-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--slide-accent) 35%, transparent) 0%, transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -left-24 -bottom-24 size-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--slide-accent-secondary) 28%, transparent) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <motion.div
            className="text-[88px] leading-none font-extrabold tracking-tight"
            style={{
              color: "var(--slide-heading)",
              fontFamily: "var(--slide-font-heading)",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <span style={{ color: "var(--slide-accent)" }}>{bigNum.value}</span>
          </motion.div>

          <motion.p
            className="mt-4 text-xl font-semibold"
            style={{
              color: "var(--slide-text)",
              fontFamily: "var(--slide-font-body)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32 }}
          >
            {bigNum.label}
          </motion.p>

          {bigNum.context ? (
            <motion.p
              className="mt-2 text-sm"
              style={{
                color: "var(--slide-text)",
                opacity: 0.75,
                fontFamily: "var(--slide-font-body)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 0.38 }}
            >
              {bigNum.context}
            </motion.p>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}

