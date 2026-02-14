"use client";

import { Sidebar } from "@/components/sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { PreviewPanel } from "@/components/preview-panel";
import { useGeneration } from "@/lib/hooks/use-generation";
import { useWebpageGeneration } from "@/lib/hooks/use-webpage-generation";
import { useKnowledgeGraphGeneration } from "@/lib/hooks/use-knowledge-graph-generation";
import { useState, useEffect, useMemo } from "react";
import { DeckSpec } from "@/lib/types";
import { getTheme, themeToCssVars } from "@/lib/themes";

export type OutputMode = "slides" | "webpage" | "knowledge-graph";

export default function AgentPage() {
  const [mode, setMode] = useState<OutputMode>("slides");
  const slideGeneration = useGeneration();
  const webpageGeneration = useWebpageGeneration();
  const knowledgeGraphGeneration = useKnowledgeGraphGeneration();
  const [deck, setDeck] = useState<DeckSpec | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Current generation status (regardless of mode)
  const isGenerating =
    slideGeneration.status === "generating" ||
    webpageGeneration.status === "generating" ||
    knowledgeGraphGeneration.status === "generating";

  // When slide generation completes, fetch the full DeckSpec
  useEffect(() => {
    if (slideGeneration.status === "complete" && slideGeneration.result?.deckId) {
      fetch(`/api/deck/${slideGeneration.result.deckId}`)
        .then((res) => res.json())
        .then((json) => {
          setDeck(json);
          setCurrentSlideIndex(0);
        })
        .catch(() => setDeck(null));
    }
  }, [slideGeneration.status, slideGeneration.result?.deckId]);

  // Theme CSS vars for slide preview
  const themeStyle = useMemo(() => {
    if (!deck) return {};
    return themeToCssVars(getTheme(deck.plan.suggestedTheme));
  }, [deck]);

  return (
    <main className="flex h-screen w-full bg-white text-zinc-900 font-sans antialiased overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col relative border-r border-zinc-200">
        <ChatInterface
          mode={mode}
          setMode={setMode}
          slideGeneration={slideGeneration}
          webpageGeneration={webpageGeneration}
          knowledgeGraphGeneration={knowledgeGraphGeneration}
        />
      </div>

      <div className="w-[45%] hidden lg:flex flex-col bg-zinc-50/50">
        <PreviewPanel
          mode={mode}
          slideGeneration={slideGeneration}
          webpageGeneration={webpageGeneration}
          knowledgeGraphGeneration={knowledgeGraphGeneration}
          deck={deck}
          currentSlideIndex={currentSlideIndex}
          setCurrentSlideIndex={setCurrentSlideIndex}
          themeStyle={themeStyle}
        />
      </div>
    </main>
  );
}
