"use client";

interface PresentationControlsProps {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PresentationControls({ index, total, onPrev, onNext }: PresentationControlsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 text-white rounded-full px-4 py-2 flex items-center gap-3">
      <button onClick={onPrev} className="px-2 py-1 rounded bg-white/10">←</button>
      <span>{index + 1} / {total}</span>
      <button onClick={onNext} className="px-2 py-1 rounded bg-white/10">→</button>
    </div>
  );
}
