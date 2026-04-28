"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { BulletSlide } from "./slides/bullet-slide";
import { ChartSlide } from "./slides/chart-slide";
import { TwoColumnSlide } from "./slides/two-column-slide";
import { TitleSlide } from "./slides/title-slide";
import { FullVisualSlide } from "./slides/full-visual-slide";
import { BigNumberSlide } from "./slides/big-number-slide";
import { SectionDividerSlide } from "./slides/section-divider-slide";
import { QuoteSlide } from "./slides/quote-slide";
import { SequenceSlide } from "./slides/sequence-slide";
import { StructuredListSlide } from "./slides/structured-list-slide";
import { ComparisonFamilySlide } from "./slides/comparison-family-slide";
import { GridFamilySlide } from "./slides/grid-family-slide";
import { ImageCaptionSlide } from "./slides/image-caption-slide";
import { normalizeSlideForRender } from "@/lib/renderers/slide-safety";

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
    case "section_divider":
      return SectionDividerSlide;
    case "quote":
      return QuoteSlide;
    case "timeline":
    case "roadmap":
    case "process_flow":
      return SequenceSlide;
    case "agenda":
    case "faq":
    case "sources":
    case "closing_cta":
      return StructuredListSlide;
    case "comparison":
    case "pros_cons":
    case "before_after":
    case "case_study":
    case "risk_register":
      return ComparisonFamilySlide;
    case "stat_grid":
    case "team_profiles":
    case "swot_matrix":
      return GridFamilySlide;
    case "image_with_caption":
      return ImageCaptionSlide;
    default:
      return BulletSlide;
  }
}

export function SlideRenderer({ slide, isActive }: SlideRendererProps) {
  if (!isActive) return null;

  const safeSlide = normalizeSlideForRender(slide);
  const Component = getSlideComponent(safeSlide.layout);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={safeSlide.slideNumber}
        className="h-full w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
      >
        <Component slide={safeSlide} />
      </motion.div>
    </AnimatePresence>
  );
}
