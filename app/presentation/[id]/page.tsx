"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import { PresentationControls } from "@/components/presentation/presentation-controls";
import { SlideRenderer } from "@/components/presentation/slide-renderer";
import { DeckSpec } from "@/lib/types";
import { getTheme, themeToCssVars } from "@/lib/themes";

export default function PresentationPage({ params }: { params: { id: string } }) {
  const [deck, setDeck] = useState<DeckSpec | null>(null);
  const [index, setIndex] = useState(0);
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "true";

  useEffect(() => {
    fetch(`/api/deck/${params.id}`)
      .then((res) => res.json())
      .then((json) => setDeck(json))
      .catch(() => setDeck(null));
  }, [params.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!deck) return;
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, deck.slides.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck]);

  const style = useMemo(() => {
    if (!deck) return {};
    return themeToCssVars(getTheme(deck.plan.suggestedTheme));
  }, [deck]);

  if (!deck) return <main className="p-10">Loading...</main>;

  return (
    <main className="min-h-screen" style={style as React.CSSProperties}>
      <div className="h-screen w-screen" style={{ background: "var(--slide-bg)", color: "var(--slide-text)" }}>
        <ErrorBoundary>
          <SlideRenderer slide={deck.slides[index]} isActive />
        </ErrorBoundary>
      </div>
      <PresentationControls
        index={index}
        total={deck.slides.length}
        onPrev={() => setIndex((i) => Math.max(i - 1, 0))}
        onNext={() => setIndex((i) => Math.min(i + 1, deck.slides.length - 1))}
      />

      {debug ? (
        <aside className="fixed top-4 right-4 w-[420px] max-h-[80vh] overflow-auto bg-black/85 text-white text-xs p-3 rounded">
          <h3 className="font-semibold mb-2">Debug</h3>
          <pre>{JSON.stringify(deck.slides[index], null, 2)}</pre>
        </aside>
      ) : null}
    </main>
  );
}
