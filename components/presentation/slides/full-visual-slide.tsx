"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { VegaChart } from "../charts/vega-chart";
import { SlideImage } from "../slide-image";

export function FullVisualSlide({ slide }: { slide: SlideSpec }) {
  const image = slide.visuals.find((a) => a.type === "image");
  const chart = slide.visuals.find((a) => a.type === "chart");

  const overlay = (
    <div className="absolute inset-0 flex items-end">
      <div
        className="w-full p-10"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.55) 100%)",
        }}
      >
        <motion.h2
          className="text-5xl font-bold tracking-tight"
          style={{
            color: "white",
            fontFamily: "var(--slide-font-heading)",
            textShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {slide.title}
        </motion.h2>
        {slide.subtitle ? (
          <motion.p
            className="mt-3 text-lg max-w-3xl"
            style={{
              color: "rgba(255,255,255,0.88)",
              fontFamily: "var(--slide-font-body)",
              textShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {slide.subtitle}
          </motion.p>
        ) : null}

        {slide.bullets.length > 0 ? (
          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
          >
            {slide.bullets.slice(0, 4).map((b, i) => (
              <span
                key={`${slide.slideNumber}-fv-pill-${i}`}
                className="px-3 py-2 rounded-full text-sm font-medium border"
                style={{
                  borderColor: "rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {b}
              </span>
            ))}
          </motion.div>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="h-full w-full relative overflow-hidden">
      {image && image.type === "image" ? (
        <>
          <SlideImage
            src={image.url}
            alt={image.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10" />
          {overlay}
        </>
      ) : chart && chart.type === "chart" && chart.vegaLiteSpec ? (
        <div className="absolute inset-0 p-10">
          <motion.div
            className="h-full w-full overflow-hidden"
            style={{
              borderRadius: "calc(var(--slide-radius) + 14px)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--slide-surface) 65%, white 35%) 0%, var(--slide-surface) 100%)",
              border: "1px solid color-mix(in srgb, var(--slide-text) 10%, transparent)",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.10)",
              padding: "20px",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <VegaChart spec={chart.vegaLiteSpec} />
          </motion.div>
          <div className="absolute left-10 right-10 bottom-10 pointer-events-none">
            <div className="max-w-4xl">
              <motion.h2
                className="text-4xl font-bold"
                style={{ color: "var(--slide-heading)", fontFamily: "var(--slide-font-heading)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {slide.title}
              </motion.h2>
              {slide.subtitle ? (
                <motion.p
                  className="mt-2 text-base"
                  style={{ color: "var(--slide-text)", opacity: 0.75 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.75 }}
                  transition={{ delay: 0.22 }}
                >
                  {slide.subtitle}
                </motion.p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: "var(--slide-bg)" }} />
          <div className="absolute inset-0 flex items-center justify-center p-10">
            <div
              className="w-full max-w-4xl rounded-[32px] border p-10 text-center"
              style={{
                borderColor: "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--slide-surface) 70%, white 30%)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--slide-text)", opacity: 0.7 }}>
                Missing visual for full-visual slide.
              </p>
              <h2
                className="mt-3 text-4xl font-bold"
                style={{ color: "var(--slide-heading)", fontFamily: "var(--slide-font-heading)" }}
              >
                {slide.title}
              </h2>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
