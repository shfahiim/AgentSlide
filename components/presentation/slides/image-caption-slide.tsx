"use client";

import { motion } from "framer-motion";
import { SlideSpec } from "@/lib/types";
import { SlideImage } from "../slide-image";
import { SlideHeading, SurfaceCard, getPrimaryImage } from "./layout-primitives";

export function ImageCaptionSlide({ slide }: { slide: SlideSpec }) {
  const image = getPrimaryImage(slide);

  return (
    <section className="h-full w-full px-[7%] py-[7%] grid grid-cols-2 gap-6 items-stretch">
      <motion.div
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.42 }}
      >
        <SurfaceCard className="h-full overflow-hidden p-3">
          <SlideImage
            src={image?.url}
            alt={image?.alt ?? slide.title}
            className="h-full w-full rounded-[22px] object-cover"
          />
        </SurfaceCard>
      </motion.div>

      <motion.div
        className="flex flex-col justify-center"
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.08, duration: 0.42 }}
      >
        <SlideHeading title={slide.title} subtitle={slide.subtitle} />
        {slide.bullets.length > 0 ? (
          <div className="mt-8 space-y-3">
            {slide.bullets.map((bullet, index) => (
              <SurfaceCard key={`${slide.slideNumber}-imgcap-${index}`} className="px-5 py-4">
                <p
                  className="text-lg"
                  style={{
                    color: "var(--slide-text)",
                    fontFamily: "var(--slide-font-body)",
                  }}
                >
                  {bullet}
                </p>
              </SurfaceCard>
            ))}
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}
