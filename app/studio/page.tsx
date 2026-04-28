"use client";

import { Sidebar } from "@/components/sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { PreviewPanel } from "@/components/preview-panel";
import { useGeneration } from "@/lib/hooks/use-generation";
import { useWebpageGeneration } from "@/lib/hooks/use-webpage-generation";
import { useKnowledgeGraphGeneration } from "@/lib/hooks/use-knowledge-graph-generation";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DeckSpec, OutputMode } from "@/lib/types";
import { getTheme, themeToCssVars } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useHistory } from "@/lib/hooks/use-history";
import { DeckFetchResult, fetchDeckSpec } from "@/lib/client/deck";
import { DeckSpecSchema } from "@/lib/schemas";

function makeSessionKey() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function fetchDeckFromPayload(payload: unknown): DeckFetchResult {
  const parsed = DeckSpecSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "invalid",
      error: parsed.error.issues[0]?.message ?? "Invalid deck payload",
    };
  }
  return { status: "ok", deck: parsed.data };
}

function deckErrorMessage(result: Exclude<DeckFetchResult, { status: "ok"; deck: DeckSpec }>): string {
  if (result.status === "not_found") return "Deck not found";
  return result.error;
}

export default function StudioPage() {
  const [mode, setMode] = useState<OutputMode>("slides");
  const slideGeneration = useGeneration();
  const webpageGeneration = useWebpageGeneration();
  const knowledgeGraphGeneration = useKnowledgeGraphGeneration();
  const history = useHistory();
  const [deck, setDeck] = useState<DeckSpec | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>(
    undefined,
  );
  const [chatSessionKey, setChatSessionKey] = useState(makeSessionKey);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [deckLoadError, setDeckLoadError] = useState<string | undefined>(undefined);

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(45); // percentage
  const [isResizing, setIsResizing] = useState(false);

  // When slide generation completes, fetch the full DeckSpec
  useEffect(() => {
    if (
      slideGeneration.status === "complete" &&
      slideGeneration.result?.deckId
    ) {
      fetchDeckSpec(slideGeneration.result.deckId).then((result) => {
        if (result.status === "ok") {
          setDeck(result.deck);
          setDeckLoadError(undefined);
          setCurrentSlideIndex(0);
          return;
        }
        setDeck(null);
        setCurrentSlideIndex(0);
        setDeckLoadError(deckErrorMessage(result));
      });
    }
  }, [slideGeneration.status, slideGeneration.result?.deckId]);

  // Refresh history when new outputs are created
  const lastHistoryIdRef = useRef<{ slides?: string; webpage?: string; kg?: string }>({});
  useEffect(() => {
    const id = slideGeneration.result?.deckId;
    if (
      slideGeneration.status === "complete" &&
      id &&
      lastHistoryIdRef.current.slides !== id
    ) {
      lastHistoryIdRef.current.slides = id;
      history.refresh();
    }
  }, [slideGeneration.status, slideGeneration.result?.deckId, history]);

  useEffect(() => {
    const id = webpageGeneration.result?.pageId;
    if (
      webpageGeneration.status === "complete" &&
      id &&
      lastHistoryIdRef.current.webpage !== id
    ) {
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
  const startResizing = useCallback(() => setIsResizing(true), []);

  useEffect(() => {
    const handleMouseUp = () => setIsResizing(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const sidebarWidth = isSidebarCollapsed ? 72 : 280;
        const availableWidth = window.innerWidth - sidebarWidth;
        const newWidth = ((window.innerWidth - e.clientX) / availableWidth) * 100;

        if (newWidth > 20 && newWidth < 80) setPreviewWidth(newWidth);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isSidebarCollapsed]);

  const resetAll = useCallback(() => {
    setDeck(null);
    setDeckLoadError(undefined);
    setCurrentSlideIndex(0);
    setActiveHistoryId(undefined);
    setChatInitialPrompt(undefined);
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
      resetAll();
      const selected = history.items.find((item) => item.id === id);
      setChatInitialPrompt(selected?.prompt);
      setActiveHistoryId(id);
      setChatSessionKey(makeSessionKey());

      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) return;
      const json = (await res.json()) as
        | {
            mode: "slides";
            result: {
              deckId: string;
              title: string;
              slideCount: number;
              hasPptx: boolean;
              hasWeb: boolean;
            };
            deck?: DeckSpec;
          }
        | { mode: "webpage"; result: { pageId: string; title: string; html: string } }
        | {
            mode: "knowledge-graph";
            result: { graphId: string; title: string; html: string; graphData: unknown };
          };

      if (json.mode === "slides") {
        setMode("slides");
        slideGeneration.hydrate(json.result);
        const candidate = (json as { deck?: unknown }).deck;
        if (!candidate) {
          setDeck(null);
          setDeckLoadError("History item has no deck payload");
          return;
        }
        const parsed = fetchDeckFromPayload(candidate);
        if (parsed.status === "ok") {
          setDeck(parsed.deck);
          setDeckLoadError(undefined);
        } else {
          setDeck(null);
          setDeckLoadError(deckErrorMessage(parsed));
        }
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
    [history.items, knowledgeGraphGeneration, resetAll, slideGeneration, webpageGeneration],
  );

  const handleDeleteHistory = useCallback(
    async (id: string) => {
      const ok =
        typeof window === "undefined"
          ? true
          : window.confirm("Remove this item from history? This will delete its saved output files.");
      if (!ok) return;

      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) return;

      if (activeHistoryId === id) {
        handleNew();
      }
      history.refresh();
    },
    [activeHistoryId, handleNew, history],
  );

  return (
    <main
      className={cn(
        "flex h-screen w-full bg-white text-[#111827] font-sans antialiased overflow-hidden",
        isResizing && "select-none cursor-col-resize",
      )}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        historyItems={history.items}
        historyStatus={history.status}
        onNew={handleNew}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        activeHistoryId={activeHistoryId}
      />

      <div className="flex-1 flex relative overflow-hidden">
        <div
          className="flex flex-col border-r border-zinc-200 h-full overflow-hidden"
          style={{ width: `${100 - previewWidth}%` }}
        >
          <ChatInterface
            sessionKey={chatSessionKey}
            initialUserPrompt={chatInitialPrompt}
            mode={mode}
            setMode={setMode}
            slideGeneration={slideGeneration}
            webpageGeneration={webpageGeneration}
            knowledgeGraphGeneration={knowledgeGraphGeneration}
          />
          {deckLoadError ? (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200">
              Deck load error: {deckLoadError}
            </div>
          ) : null}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={cn(
            "w-1 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors absolute z-50",
            isResizing && "bg-emerald-500/50",
          )}
          style={{ left: `${100 - previewWidth}%`, transform: "translateX(-50%)" }}
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
