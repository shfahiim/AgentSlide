"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import { PresentationControls } from "@/components/presentation/presentation-controls";
import { SlideRenderer } from "@/components/presentation/slide-renderer";
import { SlideScaler } from "@/components/presentation/slide-scaler";
import { DeckSpec } from "@/lib/types";
import { getTheme, themeToCssVars } from "@/lib/themes";
import { use } from "react";
import { fetchDeckSpec } from "@/lib/client/deck";

export default function PresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [deck, setDeck] = useState<DeckSpec | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "not_found" | "invalid" | "error"
  >("loading");
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "true";

  useEffect(() => {
    setLoadState("loading");
    setLoadMessage(null);
    setDeck(null);
    setIndex(0);

    fetchDeckSpec(id).then((result) => {
      if (result.status === "ok") {
        setDeck(result.deck);
        setLoadState("ready");
        return;
      }
      if (result.status === "not_found") {
        setLoadState("not_found");
        setLoadMessage("Deck not found");
        return;
      }
      if (result.status === "invalid") {
        setLoadState("invalid");
        setLoadMessage(result.error);
        return;
      }
      setLoadState("error");
      setLoadMessage(result.error);
    });
  }, [id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!deck) return;
      if (event.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, deck.slides.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck]);

  const style = useMemo(() => {
    if (!deck) return {};
    return themeToCssVars(getTheme(deck.plan.suggestedTheme));
  }, [deck]);

  if (loadState === "loading") return <main className="p-10">Loading deck...</main>;
  if (loadState === "not_found") return <main className="p-10">Deck not found.</main>;
  if (loadState === "invalid") {
    return (
      <main className="p-10">
        Deck is invalid and cannot be rendered.
        {loadMessage ? <p className="mt-2 text-sm opacity-70">{loadMessage}</p> : null}
      </main>
    );
  }
  if (loadState === "error" || !deck) {
    return (
      <main className="p-10">
        Failed to load deck.
        {loadMessage ? <p className="mt-2 text-sm opacity-70">{loadMessage}</p> : null}
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={style as React.CSSProperties}>
      <div
        className="h-screen w-screen"
        style={{
          background: "var(--slide-bg)",
          color: "var(--slide-text)",
        }}
      >
        <ErrorBoundary>
          <SlideScaler>
            <SlideRenderer slide={deck.slides[index]} isActive />
          </SlideScaler>
        </ErrorBoundary>
      </div>
      <PresentationControls
        index={index}
        total={deck.slides.length}
        onPrev={() => setIndex((i) => Math.max(i - 1, 0))}
        onNext={() =>
          setIndex((i) => Math.min(i + 1, deck.slides.length - 1))
        }
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
