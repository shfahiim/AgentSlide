"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { VegaChart } from "../charts/vega-chart";

export function ChartSlide({ slide }: { slide: SlideSpec }) {
  const chart = slide.visuals.find((asset) => asset.type === "chart");

  return (
    <section className="h-full w-full p-[5%] grid grid-cols-2 gap-8 items-center">
      <div>
        <motion.h2
          className="text-3xl font-bold mb-6"
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

        <ul className="space-y-3">
          {slide.bullets.map((bullet, i) => (
            <motion.li
              key={`${slide.slideNumber}-${i}`}
              className="text-lg flex items-start gap-3"
              style={{
                color: "var(--slide-text)",
                fontFamily: "var(--slide-font-body)",
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            >
              <span
                className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: "var(--slide-accent)" }}
              />
              {bullet}
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.div
        className="h-[420px] rounded-xl p-4"
        style={{ backgroundColor: "var(--slide-surface)" }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {chart?.type === "chart" && chart.vegaLiteSpec ? (
          <VegaChart spec={chart.vegaLiteSpec} />
        ) : (
          <p
            className="h-full flex items-center justify-center text-lg"
            style={{ color: "var(--slide-text)", opacity: 0.5 }}
          >
            No chart data
          </p>
        )}
      </motion.div>
    </section>
  );
}
