"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { BulletSlide } from "./slides/bullet-slide";
import { ChartSlide } from "./slides/chart-slide";
import { TitleSlide } from "./slides/title-slide";

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
    // v2 layouts — fallback to bullets for now
    case "two_column":
    case "full_visual":
    case "big_number":
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
