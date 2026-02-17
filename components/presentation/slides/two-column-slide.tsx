"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TwoColumnSlide({ slide }: { slide: SlideSpec }) {
  const table = slide.visuals.find((a) => a.type === "table");

  return (
    <section className="h-full w-full px-[7%] py-[7%] flex flex-col gap-6">
      <div>
        <motion.h2
          className="text-4xl font-bold"
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
            className="mt-2 text-lg"
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
      </div>

      {table && table.type === "table" ? (
        <motion.div
          className="flex-1 overflow-hidden"
          style={{
            borderRadius: "calc(var(--slide-radius) + 10px)",
            border: "1px solid color-mix(in srgb, var(--slide-text) 10%, transparent)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--slide-surface) 70%, white 30%) 0%, var(--slide-surface) 100%)",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
        >
          <div className="h-full w-full overflow-auto p-5">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {table.headers.map((h, idx) => (
                    <th
                      key={`${slide.slideNumber}-th-${idx}`}
                      className={cn(
                        "text-left text-xs font-bold uppercase tracking-wider px-4 py-3 border-b",
                      )}
                      style={{
                        color: "var(--slide-heading)",
                        borderColor:
                          "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rIdx) => (
                  <tr key={`${slide.slideNumber}-tr-${rIdx}`}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={`${slide.slideNumber}-td-${rIdx}-${cIdx}`}
                        className="px-4 py-3 text-sm border-b align-top"
                        style={{
                          color: "var(--slide-text)",
                          borderColor:
                            "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                          backgroundColor:
                            rIdx % 2 === 0
                              ? "transparent"
                              : "color-mix(in srgb, var(--slide-surface) 55%, white 45%)",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 items-start">
          {(() => {
            const mid = Math.ceil(slide.bullets.length / 2);
            const left = slide.bullets.slice(0, mid);
            const right = slide.bullets.slice(mid);
            const renderCol = (items: string[], side: "left" | "right") => (
              <motion.div
                key={side}
                className="h-full"
                initial={{ opacity: 0, x: side === "left" ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.4 }}
              >
                <div className="space-y-3">
                  {items.map((b, i) => (
                    <div
                      key={`${slide.slideNumber}-${side}-${i}`}
                      className="px-4 py-3 rounded-2xl border"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--slide-text) 10%, transparent)",
                        backgroundColor:
                          "color-mix(in srgb, var(--slide-surface) 70%, white 30%)",
                      }}
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
                    </div>
                  ))}
                </div>
              </motion.div>
            );
            return (
              <>
                {renderCol(left, "left")}
                {renderCol(right, "right")}
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}

