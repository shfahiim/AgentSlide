"use client";

import { useCallback } from "react";

interface PresentationControlsProps {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PresentationControls({
  index,
  total,
  onPrev,
  onNext,
}: PresentationControlsProps) {
  const progress = ((index + 1) / total) * 100;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
      {/* Progress bar behind the controls */}
      <div className="absolute -top-2 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: "var(--slide-accent, #6366f1)",
          }}
        />
      </div>

      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm text-white rounded-full px-5 py-2.5">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          ←
        </button>

        <span className="text-sm font-medium tabular-nums min-w-[3em] text-center">
          {index + 1} / {total}
        </span>

        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          →
        </button>

        <div className="w-px h-4 bg-white/20" />

        <button
          onClick={toggleFullscreen}
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-sm"
          title="Toggle fullscreen"
        >
          ⛶
        </button>
      </div>
    </div>
  );
}
