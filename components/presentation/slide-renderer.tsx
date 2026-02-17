"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { BulletSlide } from "./slides/bullet-slide";
import { ChartSlide } from "./slides/chart-slide";
import { TwoColumnSlide } from "./slides/two-column-slide";
import { TitleSlide } from "./slides/title-slide";
import { FullVisualSlide } from "./slides/full-visual-slide";
import { BigNumberSlide } from "./slides/big-number-slide";

interface SlideRendererProps {
  slide: SlideSpec;
  isActive: boolean;
}

function getSlideComponent(layout: SlideSpec["layout"]) {
  switch (layout) {
    case "title_slide":
      return TitleSlide;
    case "chart_with_text":
      return ChartSlide;
    case "bullets":
      return BulletSlide;
    case "two_column":
      return TwoColumnSlide;
    case "full_visual":
      return FullVisualSlide;
    case "big_number":
      return BigNumberSlide;
    default:
      return BulletSlide;
  }
}

export function SlideRenderer({ slide, isActive }: SlideRendererProps) {
  if (!isActive) return null;

  const Component = getSlideComponent(slide.layout);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slide.slideNumber}
        className="h-full w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
      >
        <Component slide={slide} />
      </motion.div>
    </AnimatePresence>
  );
}
