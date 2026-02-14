"use client";

import {
    SendHorizontal,
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Circle,
    ChevronDown,
    ChevronRight,
    Presentation,
    Globe,
    Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { GenerationState } from "@/lib/hooks/use-generation";
import { WebpageGenerationState } from "@/lib/hooks/use-webpage-generation";
import { KnowledgeGraphGenerationState } from "@/lib/hooks/use-knowledge-graph-generation";
import { PipelineProgress, AgentStepName } from "@/lib/types";
import { OutputMode } from "@/app/page";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    type?: "text" | "progress" | "result" | "error";
}

interface ChatInterfaceProps {
    mode: OutputMode;
    setMode: (mode: OutputMode) => void;
    slideGeneration: GenerationState & { generate: (prompt: string) => Promise<void> };
    webpageGeneration: WebpageGenerationState & { generate: (prompt: string) => Promise<void> };
    knowledgeGraphGeneration: KnowledgeGraphGenerationState & {
        generate: (prompt: string, depth?: number) => Promise<void>;
    };
}

const STEP_LABELS: Record<AgentStepName, string> = {
    intake: "Understanding your prompt",
    planning: "Planning slide structure",
    research: "Researching key facts",
    generation: "Generating content",
    assets: "Processing charts & visuals",
    qa: "Quality check",
    rendering: "Building output files",
};

function ProgressTracker({ progress }: { progress: PipelineProgress[] }) {
    const [collapsed, setCollapsed] = useState(false);

    const stepMap = new Map<string, PipelineProgress>();
    progress.forEach((p) => stepMap.set(p.step, p));
    const steps = Array.from(stepMap.values());

    return (
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
                {collapsed ? (
                    <ChevronRight className="size-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="size-4 text-zinc-400" />
                )}
                Agent Workflow
                <span className="ml-auto text-xs text-zinc-400">
                    {steps.filter((s) => s.status === "done").length}/{steps.length} steps
                </span>
            </button>

            {!collapsed && (
                <div className="px-4 pb-3 space-y-2">
                    {steps.map((step, i) => (
                        <div key={`${step.step}-${i}`} className="flex items-center gap-3 text-sm">
                            {step.status === "done" || step.status === "skipped" ? (
                                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            ) : step.status === "running" ? (
                                <Loader2 className="size-4 text-indigo-500 animate-spin shrink-0" />
                            ) : step.status === "error" ? (
                                <AlertCircle className="size-4 text-red-500 shrink-0" />
                            ) : (
                                <Circle className="size-4 text-zinc-300 shrink-0" />
                            )}
                            <span
                                className={cn(
                                    step.status === "running" ? "text-zinc-900 font-medium" : "text-zinc-500"
                                )}
                            >
                                {STEP_LABELS[step.step as AgentStepName] ?? step.message}
                            </span>
                            {step.detail && (
                                <span className="text-xs text-zinc-400 ml-auto">{step.detail}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ChatInterface({
    mode,
    setMode,
    slideGeneration,
    webpageGeneration,
    knowledgeGraphGeneration,
}: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const [kgDepth, setKgDepth] = useState(2);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm PresentAI — your presentation architect. Describe any topic, and I'll build a slide deck, a visual webpage, or an interactive knowledge graph for you. Choose your output mode below.",
        },
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasAddedResult = useRef(false);

    const currentGen =
        mode === "slides"
            ? slideGeneration
            : mode === "webpage"
                ? webpageGeneration
                : knowledgeGraphGeneration;
    const isGenerating =
        slideGeneration.status === "generating" ||
        webpageGeneration.status === "generating" ||
        knowledgeGraphGeneration.status === "generating";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentGen.progress.length]);

    // Slide result
    useEffect(() => {
        if (slideGeneration.status === "complete" && slideGeneration.result && !hasAddedResult.current) {
            hasAddedResult.current = true;
            const r = slideGeneration.result;
            setMessages((prev) => [
                ...prev,
                {
                    id: `result-${Date.now()}`,
                    role: "assistant",
                    content: `Done! "${r.title}" — ${r.slideCount} slides generated. Check the preview panel on the right.${r.hasPptx ? " PPTX is ready for download." : ""}`,
                    type: "result",
                },
            ]);
        }
    }, [slideGeneration.status, slideGeneration.result]);

    // Webpage result
    useEffect(() => {
        if (webpageGeneration.status === "complete" && webpageGeneration.result && !hasAddedResult.current) {
            hasAddedResult.current = true;
            const r = webpageGeneration.result;
            setMessages((prev) => [
                ...prev,
                {
                    id: `result-${Date.now()}`,
                    role: "assistant",
                    content: `Done! Your visual webpage "${r.title}" is ready. Check the preview panel on the right — it's a fully interactive page with charts, infographics, and animations.`,
                    type: "result",
                },
            ]);
        }
    }, [webpageGeneration.status, webpageGeneration.result]);

    // Knowledge Graph result
    useEffect(() => {
        if (
            knowledgeGraphGeneration.status === "complete" &&
            knowledgeGraphGeneration.result &&
            !hasAddedResult.current
        ) {
            hasAddedResult.current = true;
            const r = knowledgeGraphGeneration.result;
            const nodeCount = r.graphData?.nodes?.length ?? 0;
            const edgeCount = r.graphData?.edges?.length ?? 0;
            setMessages((prev) => [
                ...prev,
                {
                    id: `result-${Date.now()}`,
                    role: "assistant",
                    content: `Done! Knowledge graph "${r.title}" is ready — ${nodeCount} concepts, ${edgeCount} connections. Explore it in the preview panel. You can drag nodes, zoom, and hover for details.`,
                    type: "result",
                },
            ]);
        }
    }, [knowledgeGraphGeneration.status, knowledgeGraphGeneration.result]);

    // Error handling
    useEffect(() => {
        if (slideGeneration.status === "error" && slideGeneration.error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: `Something went wrong: ${slideGeneration.error}`,
                    type: "error",
                },
            ]);
        }
    }, [slideGeneration.status, slideGeneration.error]);

    useEffect(() => {
        if (webpageGeneration.status === "error" && webpageGeneration.error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: `Something went wrong: ${webpageGeneration.error}`,
                    type: "error",
                },
            ]);
        }
    }, [webpageGeneration.status, webpageGeneration.error]);

    useEffect(() => {
        if (knowledgeGraphGeneration.status === "error" && knowledgeGraphGeneration.error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: `Something went wrong: ${knowledgeGraphGeneration.error}`,
                    type: "error",
                },
            ]);
        }
    }, [knowledgeGraphGeneration.status, knowledgeGraphGeneration.error]);

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;

        const modeLabel =
            mode === "slides"
                ? "📊 Slides"
                : mode === "webpage"
                    ? "🌐 Webpage"
                    : "🧠 Knowledge Graph";

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: `[${modeLabel}] ${input}`,
        };
        setMessages((prev) => [...prev, userMsg]);
        const prompt = input;
        setInput("");
        hasAddedResult.current = false;

        if (mode === "slides") {
            slideGeneration.generate(prompt);
        } else if (mode === "webpage") {
            webpageGeneration.generate(prompt);
        } else {
            knowledgeGraphGeneration.generate(prompt, kgDepth);
        }
    };

    const placeholders: Record<OutputMode, string> = {
        slides: "Describe your presentation...",
        webpage: "Describe the webpage you want (topic, data, style)...",
        "knowledge-graph": "Enter a topic to map as a knowledge graph...",
    };

    const footerText: Record<OutputMode, string> = {
        slides: "Generates PPTX + Web slides",
        webpage: "Generates a visual HTML page",
        "knowledge-graph": "Generates an interactive knowledge graph",
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-44">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex gap-4 max-w-3xl mx-auto",
                            msg.role === "user" ? "flex-row-reverse" : ""
                        )}
                    >
                        {msg.role === "assistant" ? (
                            <div className="size-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                                <Sparkles className="size-4 text-white" />
                            </div>
                        ) : (
                            <div className="size-8 rounded-full bg-zinc-200 shrink-0 mt-1" />
                        )}

                        <div className={cn("space-y-2 min-w-0", msg.role === "user" ? "text-right" : "")}>
                            {msg.role === "assistant" && (
                                <p className="font-medium text-sm text-zinc-900">PresentAI</p>
                            )}
                            <div
                                className={cn(
                                    "inline-block rounded-2xl text-base",
                                    msg.role === "user"
                                        ? "bg-zinc-100 text-zinc-800 px-5 py-3"
                                        : "bg-transparent p-0 text-zinc-600 leading-relaxed",
                                    msg.type === "error" && "text-red-600"
                                )}
                            >
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Live pipeline progress */}
                {isGenerating && currentGen.progress.length > 0 && (
                    <div className="flex gap-4 max-w-3xl mx-auto">
                        <div className="size-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                            <Loader2 className="size-4 text-white animate-spin" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="font-medium text-sm text-zinc-900">PresentAI</p>
                            <ProgressTracker progress={currentGen.progress} />
                        </div>
                    </div>
                )}

                {isGenerating && currentGen.progress.length === 0 && (
                    <div className="flex gap-4 max-w-3xl mx-auto">
                        <div className="size-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-sm mt-1 opacity-60">
                            <Loader2 className="size-4 text-white animate-spin" />
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-sm text-zinc-900">PresentAI</p>
                            <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                <span className="relative flex size-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full size-2 bg-indigo-500"></span>
                                </span>
                                Connecting to pipeline...
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestion chips */}
            {messages.length === 1 && !isGenerating && (
                <div className="absolute bottom-52 left-0 right-0 flex justify-center">
                    <div className="flex flex-wrap gap-2 max-w-3xl px-4">
                        {mode === "knowledge-graph"
                            ? [
                                "Machine Learning algorithms and their relationships",
                                "History of the Internet — key events and technologies",
                                "Climate change causes, effects, and solutions",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors shadow-sm"
                                >
                                    {suggestion}
                                </button>
                            ))
                            : [
                                "A pitch deck for an AI coffee machine startup",
                                "Renewable energy adoption in Bangladesh",
                                "Q3 Marketing Strategy for a SaaS company",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors shadow-sm"
                                >
                                    {suggestion}
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50 p-3 flex flex-col gap-2 relative ring-1 ring-zinc-900/5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={placeholders[mode]}
                        className="w-full resize-none bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 min-h-[48px] max-h-[200px] py-3 px-2"
                        rows={1}
                    />

                    <div className="flex items-center justify-between pl-1">
                        {/* Mode toggle */}
                        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setMode("slides")}
                                disabled={isGenerating}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    mode === "slides"
                                        ? "bg-white text-zinc-900 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                <Presentation className="size-3.5" />
                                Slides
                            </button>
                            <button
                                onClick={() => setMode("webpage")}
                                disabled={isGenerating}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    mode === "webpage"
                                        ? "bg-white text-zinc-900 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                <Globe className="size-3.5" />
                                Webpage
                            </button>
                            <button
                                onClick={() => setMode("knowledge-graph")}
                                disabled={isGenerating}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    mode === "knowledge-graph"
                                        ? "bg-white text-zinc-900 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                <Network className="size-3.5" />
                                Graph
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Depth selector — only for knowledge-graph mode */}
                            {mode === "knowledge-graph" && (
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                    <span className="font-medium">Depth:</span>
                                    {[1, 2, 3].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setKgDepth(d)}
                                            disabled={isGenerating}
                                            className={cn(
                                                "size-6 rounded-md text-xs font-medium transition-all",
                                                kgDepth === d
                                                    ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                                                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                            )}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isGenerating}
                                className={cn(
                                    "size-9 flex items-center justify-center rounded-lg transition-all duration-200",
                                    input.trim() && !isGenerating
                                        ? "bg-zinc-900 text-white shadow-md hover:bg-zinc-800"
                                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                )}
                            >
                                <SendHorizontal className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center text-xs text-zinc-400 mt-3 pb-2">
                    Powered by Gemini · {footerText[mode]}
                </p>
            </div>
        </div>
    );
}
