"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { BulletSlide } from "./slides/bullet-slide";
import { ChartSlide } from "./slides/chart-slide";
import { TitleSlide } from "./slides/title-slide";

export function SlideRenderer({ slide, isActive }: { slide: SlideSpec; isActive: boolean }) {
  if (!isActive) return null;

  const body =
    slide.layout === "title_slide" ? <TitleSlide slide={slide} /> :
    slide.layout === "chart_with_text" ? <ChartSlide slide={slide} /> :
    <BulletSlide slide={slide} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full w-full"
    >
      {body}
    </motion.div>
  );
}
