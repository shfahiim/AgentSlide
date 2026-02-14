"use client";

import {
    Play,
    Download,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeckSpec } from "@/lib/types";
import { ErrorBoundary } from "@/components/error-boundary";
import { SlideRenderer } from "@/components/presentation/slide-renderer";
import { GenerationState } from "@/lib/hooks/use-generation";
import { WebpageGenerationState } from "@/lib/hooks/use-webpage-generation";
import { KnowledgeGraphGenerationState } from "@/lib/hooks/use-knowledge-graph-generation";
import { OutputMode } from "@/app/page";
import Link from "next/link";
import { useMemo } from "react";

interface PreviewPanelProps {
    mode: OutputMode;
    slideGeneration: GenerationState & { generate: (prompt: string) => Promise<void> };
    webpageGeneration: WebpageGenerationState & { generate: (prompt: string) => Promise<void> };
    knowledgeGraphGeneration: KnowledgeGraphGenerationState & {
        generate: (prompt: string, depth?: number) => Promise<void>;
    };
    deck: DeckSpec | null;
    currentSlideIndex: number;
    setCurrentSlideIndex: (index: number) => void;
    themeStyle: Record<string, string>;
}

export function PreviewPanel({
    mode,
    slideGeneration,
    webpageGeneration,
    knowledgeGraphGeneration,
    deck,
    currentSlideIndex,
    setCurrentSlideIndex,
    themeStyle,
}: PreviewPanelProps) {
    const slides = deck?.slides ?? [];
    const currentSlide = slides[currentSlideIndex];
    const deckId = slideGeneration.result?.deckId;
    const webpageHtml = webpageGeneration.result?.html;
    const kgHtml = knowledgeGraphGeneration.result?.html;

    const currentGen =
        mode === "slides"
            ? slideGeneration
            : mode === "webpage"
                ? webpageGeneration
                : knowledgeGraphGeneration;

    const isGenerating = currentGen.status === "generating";
    const isComplete = currentGen.status === "complete";

    // Build the data URI for the iframe
    const iframeSrcDoc = useMemo(() => {
        if (mode === "webpage") return webpageHtml;
        if (mode === "knowledge-graph") return kgHtml;
        return undefined;
    }, [mode, webpageHtml, kgHtml]);

    const handleDownloadHtml = () => {
        const html = mode === "webpage" ? webpageHtml : kgHtml;
        const title =
            mode === "webpage"
                ? webpageGeneration.result?.title
                : knowledgeGraphGeneration.result?.title;

        if (!html) return;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title ?? "output"}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleOpenInNewTab = () => {
        const html = mode === "webpage" ? webpageHtml : kgHtml;
        if (!html) return;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-4 bg-white shrink-0">
                <span className="text-sm font-medium text-zinc-500">
                    {mode === "slides" && slides.length > 0
                        ? `Slide ${currentSlideIndex + 1} of ${slides.length}`
                        : mode === "webpage" && isComplete
                            ? "Webpage Preview"
                            : mode === "knowledge-graph" && isComplete
                                ? "Knowledge Graph Preview"
                                : "Preview"}
                </span>
                <div className="flex items-center gap-2">
                    {/* SLIDE mode actions */}
                    {mode === "slides" && deckId && slideGeneration.result?.hasPptx && (
                        <a
                            href={`/api/export?id=${deckId}`}
                            className="p-2 hover:bg-zinc-100 rounded-md text-zinc-500 transition-colors"
                            title="Download PPTX"
                        >
                            <Download className="size-4" />
                        </a>
                    )}
                    {mode === "slides" && deckId && slideGeneration.result?.hasWeb && (
                        <Link
                            href={`/presentation/${deckId}`}
                            target="_blank"
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                        >
                            <Play className="size-3.5 fill-current" />
                            <span>Present</span>
                        </Link>
                    )}

                    {/* WEBPAGE & KG mode actions */}
                    {(mode === "webpage" || mode === "knowledge-graph") && iframeSrcDoc && (
                        <>
                            <button
                                onClick={handleDownloadHtml}
                                className="p-2 hover:bg-zinc-100 rounded-md text-zinc-500 transition-colors"
                                title="Download HTML"
                            >
                                <Download className="size-4" />
                            </button>
                            <button
                                onClick={handleOpenInNewTab}
                                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                            >
                                <ExternalLink className="size-3.5" />
                                <span>Open</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 overflow-hidden bg-zinc-100/50 flex flex-col items-center justify-center relative">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                        <Loader2 className="size-8 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium">
                            {currentGen.progress.length > 0
                                ? currentGen.progress[currentGen.progress.length - 1].message
                                : "Starting pipeline..."}
                        </p>
                    </div>
                ) : mode === "slides" && slides.length > 0 && currentSlide ? (
                    <div className="p-6 w-full h-full flex items-center justify-center overflow-auto">
                        <div
                            className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-xl shadow-zinc-200/50 border border-zinc-200 relative"
                            style={
                                {
                                    ...themeStyle,
                                    background: "var(--slide-bg)",
                                    color: "var(--slide-text)",
                                } as React.CSSProperties
                            }
                        >
                            <ErrorBoundary>
                                <SlideRenderer slide={currentSlide} isActive />
                            </ErrorBoundary>
                        </div>
                    </div>
                ) : (mode === "webpage" || mode === "knowledge-graph") && iframeSrcDoc ? (
                    /* Webpage/KG iframe preview */
                    <iframe
                        srcDoc={iframeSrcDoc}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-same-origin"
                        title={`${mode} Preview`}
                    />
                ) : (
                    /* Empty State */
                    <div className="bg-white aspect-video w-full max-w-2xl mx-6 shadow-sm border border-zinc-200 rounded-xl flex flex-col items-center justify-center text-zinc-400">
                        <div className="mb-4 p-4 rounded-full bg-zinc-50 border border-zinc-100">
                            <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse opacity-20" />
                        </div>
                        <p className="text-sm text-center px-4">
                            {mode === "slides"
                                ? "Send a message to generate slides"
                                : mode === "webpage"
                                    ? "Send a message to generate a webpage"
                                    : "Send a message to generate a knowledge graph"}
                        </p>
                    </div>
                )}
            </div>

            {/* Slide Navigation (only for slide mode) */}
            {mode === "slides" && slides.length > 0 && (
                <div className="h-16 border-t border-zinc-200 bg-white flex items-center justify-center gap-4 shrink-0">
                    <button
                        onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                        disabled={currentSlideIndex === 0}
                        className="p-2 rounded-full hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeft className="size-5" />
                    </button>

                    <div className="flex gap-1.5">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlideIndex(i)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    i === currentSlideIndex
                                        ? "w-8 bg-zinc-900"
                                        : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                                )}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() =>
                            setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))
                        }
                        disabled={currentSlideIndex === slides.length - 1}
                        className="p-2 rounded-full hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
