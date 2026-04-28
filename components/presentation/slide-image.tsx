"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function SlideImage({ src, alt, className }: SlideImageProps) {
  const [hasError, setHasError] = useState(!src);

  if (hasError || !src) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-zinc-100/50 border border-dashed border-zinc-200/50",
          className
        )}
      >
        <ImageIcon className="size-10 text-zinc-400/50 mb-2" />
        <span className="text-xs font-medium text-zinc-500/70">
          Visual unavailable
        </span>
      </div>
    );
  }

  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      initial={{ scale: 1.05, opacity: 0.2 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      onError={() => setHasError(true)}
    />
  );
}
