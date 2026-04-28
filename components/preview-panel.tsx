"use client";

import {
    Play,
    Download,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ExternalLink,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStepName, DeckSpec, OutputMode, PipelineProgress } from "@/lib/types";
import { ErrorBoundary } from "@/components/error-boundary";
import { SlideRenderer } from "@/components/presentation/slide-renderer";
import { SlideScaler } from "@/components/presentation/slide-scaler";
import { GenerationState } from "@/lib/hooks/use-generation";
import { WebpageGenerationState } from "@/lib/hooks/use-webpage-generation";
import { KnowledgeGraphGenerationState } from "@/lib/hooks/use-knowledge-graph-generation";
import Link from "next/link";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STEPS: Record<OutputMode, Array<{ key: AgentStepName; label: string }>> = {
    slides: [
        { key: "intake", label: "Intake" },
        { key: "planning", label: "Planning" },
        { key: "research", label: "Research" },
        { key: "generation", label: "Drafting" },
        { key: "assets", label: "Assets" },
        { key: "qa", label: "QA" },
        { key: "rendering", label: "Rendering" },
    ],
    webpage: [
        { key: "research", label: "Research" },
        { key: "generation", label: "Generation" },
    ],
    "knowledge-graph": [
        { key: "research", label: "Research" },
        { key: "generation", label: "Graph Build" },
        { key: "rendering", label: "Rendering" },
    ],
};

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
    const webpageId = webpageGeneration.result?.pageId;
    const kgHtml = knowledgeGraphGeneration.result?.html;
    const graphId = knowledgeGraphGeneration.result?.graphId;

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

    const progressByStep = useMemo(() => {
        const map = new Map<AgentStepName, PipelineProgress>();
        for (const p of currentGen.progress) map.set(p.step, p);
        return map;
    }, [currentGen.progress]);

    const recentMessages = useMemo(() => {
        const msgs = currentGen.progress
            .map((p) => p.message)
            .filter(Boolean);
        const deduped: string[] = [];
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (deduped[0] === m) continue;
            deduped.unshift(m);
            if (deduped.length >= 3) break;
        }
        return deduped;
    }, [currentGen.progress]);

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
        const id = mode === "webpage" ? webpageId : graphId;
        if (id) {
            window.open(`/api/output-html?id=${encodeURIComponent(id)}`, "_blank");
            return;
        }
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
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="w-full h-full p-8 flex items-center justify-center"
                        >
                            <div className="w-full max-w-5xl">
                                <div className="flex flex-col lg:flex-row items-stretch gap-6">
                                    {/* Preview skeleton */}
                                    <div className="flex-1 min-w-0">
                                        <div className="rounded-[28px] border border-zinc-100 bg-white shadow-2xl shadow-zinc-900/10 overflow-hidden relative">
                                            <div className="absolute inset-0 ai-shimmer opacity-60" />
                                            <div className="relative p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                                                            AI agent generating
                                                        </span>
                                                    </div>
                                                    <Loader2 className="size-4 animate-spin text-emerald-500/40" />
                                                </div>

                                                <motion.div
                                                    className="mt-5 aspect-video rounded-2xl border border-zinc-100 bg-gradient-to-br from-white to-zinc-50/60 overflow-hidden relative"
                                                    animate={{ y: [0, -2, 0] }}
                                                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                                                >
                                                    <div className="absolute inset-0 ai-shimmer opacity-40" />

                                                    {/* Mode-specific skeleton layout */}
                                                    {mode === "slides" ? (
                                                        <div className="relative p-6 h-full">
                                                            <div className="h-5 w-2/3 rounded-lg bg-zinc-100" />
                                                            <div className="mt-3 h-3 w-1/2 rounded-md bg-zinc-100/80" />
                                                            <div className="mt-8 space-y-3">
                                                                <div className="h-3 w-11/12 rounded-md bg-zinc-100/80" />
                                                                <div className="h-3 w-10/12 rounded-md bg-zinc-100/70" />
                                                                <div className="h-3 w-9/12 rounded-md bg-zinc-100/70" />
                                                                <div className="h-3 w-8/12 rounded-md bg-zinc-100/60" />
                                                            </div>
                                                            <div className="absolute right-6 bottom-6 h-24 w-24 rounded-2xl bg-emerald-100/60 border border-emerald-200/60" />
                                                        </div>
	                                                    ) : mode === "webpage" ? (
	                                                        <div className="relative p-5 h-full">
	                                                            <div className="h-8 rounded-xl border border-zinc-200/60 bg-white/80 flex items-center px-3 gap-2">
	                                                                <div className="size-2 rounded-full bg-zinc-200" />
                                                                <div className="size-2 rounded-full bg-zinc-200" />
                                                                <div className="size-2 rounded-full bg-zinc-200" />
                                                                <div className="ml-3 h-3 w-2/3 rounded bg-zinc-100" />
                                                            </div>
                                                            <div className="mt-5 grid grid-cols-3 gap-4">
                                                                <div className="col-span-2 h-28 rounded-2xl bg-zinc-100/80" />
                                                                <div className="h-28 rounded-2xl bg-emerald-100/60 border border-emerald-200/60" />
                                                                <div className="col-span-3 h-24 rounded-2xl bg-zinc-100/70" />
                                                            </div>
                                                            <div className="mt-5 space-y-3">
                                                                <div className="h-3 w-11/12 rounded bg-zinc-100/70" />
                                                                <div className="h-3 w-10/12 rounded bg-zinc-100/60" />
                                                                <div className="h-3 w-9/12 rounded bg-zinc-100/60" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="relative p-6 h-full">
                                                            <div className="h-5 w-1/2 rounded-lg bg-zinc-100" />
                                                            <div className="mt-8 flex items-center justify-center h-[70%]">
                                                                <div className="relative w-full h-full">
                                                                    <div className="absolute left-[12%] top-[25%] size-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/70" />
                                                                    <div className="absolute left-[42%] top-[18%] size-10 rounded-2xl bg-zinc-100/80 border border-zinc-200/60" />
                                                                    <div className="absolute left-[68%] top-[32%] size-14 rounded-2xl bg-emerald-100/60 border border-emerald-200/60" />
                                                                    <div className="absolute left-[30%] top-[55%] size-11 rounded-2xl bg-zinc-100/70 border border-zinc-200/60" />
                                                                    <div className="absolute left-[58%] top-[60%] size-10 rounded-2xl bg-zinc-100/70 border border-zinc-200/60" />
                                                                    <div className="absolute inset-0 opacity-40">
                                                                        <div className="absolute left-[18%] top-[31%] h-px w-[28%] bg-emerald-300/60" />
                                                                        <div className="absolute left-[50%] top-[28%] h-px w-[22%] bg-emerald-300/60" />
                                                                        <div className="absolute left-[36%] top-[61%] h-px w-[24%] bg-emerald-300/50" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>

                                                <div className="mt-5">
                                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                                        {currentGen.progress.length > 0
                                                            ? currentGen.progress[currentGen.progress.length - 1].message
                                                            : "Starting pipeline…"}
                                                    </p>
                                                    {recentMessages.length > 1 && (
                                                        <div className="mt-2 space-y-1">
                                                            {recentMessages.slice(0, -1).map((m) => (
                                                                <p
                                                                    key={m}
                                                                    className="text-xs text-zinc-500 truncate"
                                                                >
                                                                    {m}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pipeline */}
                                    <div className="lg:w-80 w-full shrink-0">
                                        <div className="rounded-[28px] border border-zinc-100 bg-white shadow-xl shadow-zinc-900/5 overflow-hidden">
                                            <div className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                                                        Pipeline
                                                    </p>
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
                                                        Live
                                                    </span>
                                                </div>

                                                <div className="mt-4 space-y-2">
                                                    {PIPELINE_STEPS[mode].map(({ key, label }) => {
                                                        const p = progressByStep.get(key);
                                                        const status = p?.status ?? "pending";
                                                        const isRunning = status === "running";
                                                        const isDone = status === "done" || status === "skipped";
                                                        const isError = status === "error";

                                                        return (
                                                            <div
                                                                key={key}
                                                                className={cn(
                                                                    "flex items-center gap-3 rounded-2xl px-3 py-2 border",
                                                                    isRunning
                                                                        ? "border-emerald-200 bg-emerald-50"
                                                                        : isDone
                                                                            ? "border-zinc-100 bg-white"
                                                                            : isError
                                                                                ? "border-red-200 bg-red-50"
                                                                                : "border-transparent bg-zinc-50/60"
                                                                )}
                                                            >
                                                                <div className="shrink-0">
                                                                    {isDone ? (
                                                                        <div className="size-7 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                                                                            <Check className="size-4" />
                                                                        </div>
                                                                    ) : isError ? (
                                                                        <div className="size-7 rounded-xl bg-red-500/10 text-red-700 flex items-center justify-center">
                                                                            <X className="size-4" />
                                                                        </div>
                                                                    ) : isRunning ? (
                                                                        <div className="size-7 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                                                                            <Loader2 className="size-4 animate-spin" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="size-7 rounded-xl bg-zinc-200/60 text-zinc-500 flex items-center justify-center">
                                                                            <div className="size-1.5 rounded-full bg-zinc-500/40" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-zinc-900">
                                                                        {label}
                                                                    </p>
                                                                    <p className="text-xs text-zinc-500 truncate">
                                                                        {p?.detail ?? p?.message ?? (isRunning ? "Working…" : "Pending")}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                        <div className="relative bg-white aspect-video w-full max-w-2xl mx-8 shadow-xl shadow-zinc-900/5 border border-zinc-100 rounded-[32px] overflow-hidden flex items-center justify-center">
                            <div aria-hidden className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(244,244,245,0.9)_0%,rgba(255,255,255,0)_70%)]" />
                                <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-zinc-200/80" />
                                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-zinc-200/70" />
                                <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-300 ring-4 ring-white" />
                                <div className="absolute -left-24 -top-24 size-64 rounded-full border-2 border-zinc-200/70" />
                                <div className="absolute -right-28 -bottom-28 size-72 rounded-full border-2 border-zinc-200/70" />
                            </div>

                            <div className="relative px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-zinc-100 shadow-sm">
                                <p className="text-sm font-semibold text-zinc-900 text-center">
                                    Preview shows up here
                                </p>
                            </div>
                        </div>
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
