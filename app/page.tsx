"use client";

import { Sidebar } from "@/components/sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { PreviewPanel } from "@/components/preview-panel";
import { useGeneration } from "@/lib/hooks/use-generation";
import { useWebpageGeneration } from "@/lib/hooks/use-webpage-generation";
import { useKnowledgeGraphGeneration } from "@/lib/hooks/use-knowledge-graph-generation";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DeckSpec } from "@/lib/types";
import { getTheme, themeToCssVars } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useHistory } from "@/lib/hooks/use-history";

export type OutputMode = "slides" | "webpage" | "knowledge-graph";

function makeSessionKey() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

export default function AgentPage() {
  const [mode, setMode] = useState<OutputMode>("slides");
  const slideGeneration = useGeneration();
  const webpageGeneration = useWebpageGeneration();
  const knowledgeGraphGeneration = useKnowledgeGraphGeneration();
  const history = useHistory();
  const [deck, setDeck] = useState<DeckSpec | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>(undefined);
  const [chatSessionKey, setChatSessionKey] = useState(makeSessionKey);

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(45); // percentage
  const [isResizing, setIsResizing] = useState(false);

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

  // Refresh history when new outputs are created
  const lastHistoryIdRef = useRef<{ slides?: string; webpage?: string; kg?: string }>({});
  useEffect(() => {
    const id = slideGeneration.result?.deckId;
    if (slideGeneration.status === "complete" && id && lastHistoryIdRef.current.slides !== id) {
      lastHistoryIdRef.current.slides = id;
      history.refresh();
    }
  }, [slideGeneration.status, slideGeneration.result?.deckId, history]);

  useEffect(() => {
    const id = webpageGeneration.result?.pageId;
    if (webpageGeneration.status === "complete" && id && lastHistoryIdRef.current.webpage !== id) {
      lastHistoryIdRef.current.webpage = id;
      history.refresh();
    }
  }, [webpageGeneration.status, webpageGeneration.result?.pageId, history]);

  useEffect(() => {
    const id = knowledgeGraphGeneration.result?.graphId;
    if (
      knowledgeGraphGeneration.status === "complete" &&
      id &&
      lastHistoryIdRef.current.kg !== id
    ) {
      lastHistoryIdRef.current.kg = id;
      history.refresh();
    }
  }, [knowledgeGraphGeneration.status, knowledgeGraphGeneration.result?.graphId, history]);

  // Theme CSS vars for slide preview
  const themeStyle = useMemo(() => {
    if (!deck) return {};
    return themeToCssVars(getTheme(deck.plan.suggestedTheme));
  }, [deck]);

  // Resizing Logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const sidebarWidth = isSidebarCollapsed ? 64 : 256;
      const availableWidth = window.innerWidth - sidebarWidth;
      const newWidth = ((window.innerWidth - e.clientX) / availableWidth) * 100;
      
      if (newWidth > 20 && newWidth < 80) {
        setPreviewWidth(newWidth);
      }
    }
  }, [isResizing, isSidebarCollapsed]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const resetAll = useCallback(() => {
    setDeck(null);
    setCurrentSlideIndex(0);
    setActiveHistoryId(undefined);
    slideGeneration.reset();
    webpageGeneration.reset();
    knowledgeGraphGeneration.reset();
  }, [knowledgeGraphGeneration, slideGeneration, webpageGeneration]);

  const handleNew = useCallback(() => {
    resetAll();
    setMode("slides");
    setChatSessionKey(makeSessionKey());
  }, [resetAll]);

  const handleSelectHistory = useCallback(
    async (id: string) => {
      setActiveHistoryId(id);
      setChatSessionKey(makeSessionKey());
      resetAll();

      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) return;
      const json = (await res.json()) as
        | { mode: "slides"; result: { deckId: string; title: string; slideCount: number; hasPptx: boolean; hasWeb: boolean }; deck?: DeckSpec }
        | { mode: "webpage"; result: { pageId: string; title: string; html: string } }
        | { mode: "knowledge-graph"; result: { graphId: string; title: string; html: string; graphData: unknown } };

      if (json.mode === "slides") {
        setMode("slides");
        slideGeneration.hydrate(json.result);
        setDeck((json as { deck?: DeckSpec }).deck ?? null);
        setCurrentSlideIndex(0);
        return;
      }

      if (json.mode === "webpage") {
        setMode("webpage");
        webpageGeneration.hydrate(json.result);
        return;
      }

      setMode("knowledge-graph");
      knowledgeGraphGeneration.hydrate({
        graphId: json.result.graphId,
        title: json.result.title,
        html: json.result.html,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphData: json.result.graphData as any,
      });
    },
    [knowledgeGraphGeneration, resetAll, slideGeneration, webpageGeneration]
  );

  return (
    <main className={cn(
        "flex h-screen w-full bg-white text-[#111827] font-sans antialiased overflow-hidden",
        isResizing && "select-none cursor-col-resize"
    )}>
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        historyItems={history.items}
        historyStatus={history.status}
        onNew={handleNew}
        onSelectHistory={handleSelectHistory}
        activeHistoryId={activeHistoryId}
      />

      <div className="flex-1 flex relative overflow-hidden">
        <div 
          className="flex flex-col border-r border-zinc-200 h-full"
          style={{ width: `${100 - previewWidth}%` }}
        >
          <ChatInterface
            sessionKey={chatSessionKey}
            mode={mode}
            setMode={setMode}
            slideGeneration={slideGeneration}
            webpageGeneration={webpageGeneration}
            knowledgeGraphGeneration={knowledgeGraphGeneration}
          />
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={cn(
              "w-1 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors absolute z-50",
              isResizing && "bg-emerald-500/50"
          )}
          style={{ left: `${100 - previewWidth}%`, transform: 'translateX(-50%)' }}
        />

        <div 
          className="hidden lg:flex flex-col bg-zinc-50/30 h-full overflow-hidden"
          style={{ width: `${previewWidth}%` }}
        >
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
      </div>
    </main>
  );
}
