"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { SlideHeading, SurfaceCard, getPrimaryTable, splitBullets } from "./layout-primitives";

function getLabels(layout: SlideSpec["layout"], count: number) {
  switch (layout) {
    case "pros_cons":
      return ["Pros", "Cons"];
    case "before_after":
      return ["Before", "After"];
    case "case_study":
      return ["Problem", "Solution", "Outcome"];
    case "risk_register":
      return ["Risk", "Impact", "Mitigation"];
    default:
      return count <= 2 ? ["Option A", "Option B"] : ["A", "B", "C", "D"];
  }
}

export function ComparisonFamilySlide({ slide }: { slide: SlideSpec }) {
  const table = getPrimaryTable(slide);

  if (table) {
    return (
      <section className="h-full w-full px-[7%] py-[7%] flex flex-col gap-6">
        <SlideHeading title={slide.title} subtitle={slide.subtitle} />
        <SurfaceCard className="flex-1 overflow-hidden p-5">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {table.headers.map((header, index) => (
                  <th
                    key={`${slide.slideNumber}-cmp-th-${index}`}
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] border-b"
                    style={{
                      color: "var(--slide-heading)",
                      borderColor: "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={`${slide.slideNumber}-cmp-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${slide.slideNumber}-cmp-cell-${rowIndex}-${cellIndex}`}
                      className="px-4 py-3 text-sm align-top border-b"
                      style={{
                        color: "var(--slide-text)",
                        borderColor: "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </SurfaceCard>
      </section>
    );
  }

  if (slide.layout === "case_study") {
    const labels = getLabels(slide.layout, slide.bullets.length);
    return (
      <section className="h-full w-full px-[7%] py-[7%] flex flex-col gap-6">
        <SlideHeading title={slide.title} subtitle={slide.subtitle} />
        <div className="grid flex-1 grid-cols-3 gap-5">
          {slide.bullets.map((bullet, index) => (
            <motion.div
              key={`${slide.slideNumber}-case-${index}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.08, duration: 0.35 }}
            >
              <SurfaceCard className="h-full p-6">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "var(--slide-text)", opacity: 0.55 }}
                >
                  {labels[index] ?? `Block ${index + 1}`}
                </p>
                <p
                  className="mt-4 text-lg leading-snug"
                  style={{ color: "var(--slide-heading)", fontFamily: "var(--slide-font-body)" }}
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

  const [left, right] = splitBullets(slide.bullets);
  const labels = getLabels(slide.layout, 2);

  return (
    <section className="h-full w-full px-[7%] py-[7%] flex flex-col gap-6">
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="grid flex-1 grid-cols-2 gap-6">
        {[left, right].map((items, columnIndex) => (
          <motion.div
            key={`${slide.slideNumber}-cmp-col-${columnIndex}`}
            initial={{ opacity: 0, x: columnIndex === 0 ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 + columnIndex * 0.08, duration: 0.35 }}
          >
            <SurfaceCard className="h-full p-6">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--slide-text)", opacity: 0.55 }}
              >
                {labels[columnIndex] ?? `Column ${columnIndex + 1}`}
              </p>
              <div className="mt-4 space-y-3">
                {items.map((bullet, itemIndex) => (
                  <div
                    key={`${slide.slideNumber}-cmp-item-${columnIndex}-${itemIndex}`}
                    className="rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--slide-surface) 68%, white 32%)",
                    }}
                  >
                    <p
                      className="text-base leading-snug"
                      style={{
                        color: "var(--slide-text)",
                        fontFamily: "var(--slide-font-body)",
                      }}
                    >
                      {bullet}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
