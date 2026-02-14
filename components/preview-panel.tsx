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
import { motion, AnimatePresence } from "framer-motion";

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
        <div className="flex flex-col h-full bg-white">
            {/* Toolbar */}
            <div className="h-14 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {mode === "slides" && slides.length > 0
                        ? `Slide ${currentSlideIndex + 1} of ${slides.length}`
                        : mode === "webpage" && isComplete
                            ? "Webpage Preview"
                            : mode === "knowledge-graph" && isComplete
                                ? "Knowledge Graph Preview"
                                : "Preview"}
                </span>
                <div className="flex items-center gap-2">
                    {mode === "slides" && deckId && slideGeneration.result?.hasPptx && (
                        <button
                            onClick={() => window.location.href = `/api/export?id=${deckId}`}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
                            title="Download PPTX"
                        >
                            <Download className="size-4" />
                        </button>
                    )}
                    {mode === "slides" && deckId && slideGeneration.result?.hasWeb && (
                        <Link
                            href={`/presentation/${deckId}`}
                            target="_blank"
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-200 active:scale-95"
                        >
                            <Play className="size-3.5 fill-current" />
                            <span>Present</span>
                        </Link>
                    )}

                    {(mode === "webpage" || mode === "knowledge-graph") && iframeSrcDoc && (
                        <>
                            <button
                                onClick={handleDownloadHtml}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
                                title="Download HTML"
                            >
                                <Download className="size-4" />
                            </button>
                            <button
                                onClick={handleOpenInNewTab}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-200 active:scale-95"
                            >
                                <ExternalLink className="size-3.5" />
                                <span>Open</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 overflow-hidden bg-zinc-50/30 flex flex-col items-center justify-center relative">
                <AnimatePresence mode="wait">
                    {isGenerating ? (
                        <motion.div 
                            key="generating"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center gap-4 text-zinc-800"
                        >
                            <div className="relative">
                                <Loader2 className="size-12 animate-spin text-emerald-500/20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                {currentGen.progress.length > 0
                                    ? currentGen.progress[currentGen.progress.length - 1].message
                                    : "Starting pipeline..."}
                            </p>
                        </motion.div>
                    ) : mode === "slides" && slides.length > 0 && currentSlide ? (
                        <motion.div 
                            key={`slide-${currentSlideIndex}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 w-full h-full flex items-center justify-center overflow-auto"
                        >
                            <div
                                className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/10 border border-zinc-100 relative bg-white"
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
                        </motion.div>
                    ) : (mode === "webpage" || mode === "knowledge-graph") && iframeSrcDoc ? (
                        <motion.iframe
                            key="iframe-result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            srcDoc={iframeSrcDoc}
                            className="w-full h-full border-0 bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            title={`${mode} Preview`}
                        />
                    ) : (
                        /* Empty State */
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white aspect-video w-full max-w-2xl mx-8 shadow-xl shadow-zinc-900/5 border border-zinc-50 rounded-[32px] flex flex-col items-center justify-center text-zinc-300"
                        >
                            <div className="mb-6 p-6 rounded-3xl bg-zinc-50/50 border border-zinc-100">
                                <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 animate-pulse opacity-20" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-center px-8">
                                {mode === "slides"
                                    ? "Describe topic to generate slides"
                                    : mode === "webpage"
                                        ? "Describe topic to generate webpage"
                                        : "Describe topic to generate graph"}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Slide Navigation (only for slide mode) */}
            {mode === "slides" && slides.length > 0 && (
                <div className="h-16 border-t border-zinc-100 bg-white flex items-center justify-center gap-8 shrink-0">
                    <button
                        onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                        disabled={currentSlideIndex === 0}
                        className="p-2 rounded-xl text-zinc-800 hover:bg-zinc-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-90"
                    >
                        <ChevronLeft className="size-6" />
                    </button>

                    <div className="flex gap-2">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlideIndex(i)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    i === currentSlideIndex
                                        ? "w-10 bg-emerald-500 shadow-sm shadow-emerald-200"
                                        : "w-1.5 bg-emerald-100 hover:bg-emerald-200"
                                )}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() =>
                            setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))
                        }
                        disabled={currentSlideIndex === slides.length - 1}
                        className="p-2 rounded-xl text-emerald-800 hover:bg-emerald-50 disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-90"
                    >
                        <ChevronRight className="size-6" />
                    </button>
                </div>
            )}
        </div>
    );
}
