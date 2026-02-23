"use client";

import {
    SendHorizontal,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Circle,
    ChevronDown,
    ChevronRight,
    Presentation,
    Globe,
    Network,
    Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { GenerationState } from "@/lib/hooks/use-generation";
import { WebpageGenerationState } from "@/lib/hooks/use-webpage-generation";
import { KnowledgeGraphGenerationState } from "@/lib/hooks/use-knowledge-graph-generation";
import { StudyYtGenerationState } from "@/lib/hooks/use-study-yt-generation";
import { PipelineProgress, AgentStepName } from "@/lib/types";
import { OutputMode } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    type?: "text" | "progress" | "result" | "error";
    links?: Array<{ label: string; href: string }>;
}

interface ChatInterfaceProps {
    sessionKey: string;
    initialUserPrompt?: string;
    mode: OutputMode;
    setMode: (mode: OutputMode) => void;
    slideGeneration: GenerationState & { generate: (prompt: string, theme?: string) => Promise<void> };
    webpageGeneration: WebpageGenerationState & { generate: (prompt: string) => Promise<void> };
    knowledgeGraphGeneration: KnowledgeGraphGenerationState & {
        generate: (prompt: string, depth?: number) => Promise<void>;
    };
    studyYtGeneration: StudyYtGenerationState & { generate: (urlOrId: string) => Promise<void> };
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

function ThinkingDots() {
    return (
        <div className="flex gap-1 items-center h-4 px-1">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -4, 0],
                        opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut"
                    }}
                    className="size-1.5 rounded-full bg-emerald-500"
                />
            ))}
        </div>
    );
}

function ProgressTracker({ progress }: { progress: PipelineProgress[] }) {
    const [collapsed, setCollapsed] = useState(false);

    const stepMap = new Map<string, PipelineProgress>();
    progress.forEach((p) => stepMap.set(p.step, p));
    const steps = Array.from(stepMap.values());

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm"
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
                {collapsed ? (
                    <ChevronRight className="size-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="size-4 text-zinc-400" />
                )}
                Agent Workflow
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {steps.filter((s) => s.status === "done").length}/{steps.length} steps
                </span>
            </button>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-3 space-y-2"
                    >
                        {steps.map((step, i) => (
                            <motion.div 
                                key={`${step.step}-${i}`} 
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 text-sm"
                            >
                                {step.status === "done" || step.status === "skipped" ? (
                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                                ) : step.status === "running" ? (
                                    <Loader2 className="size-4 text-emerald-500 animate-spin shrink-0" />
                                ) : step.status === "error" ? (
                                    <AlertCircle className="size-4 text-red-500 shrink-0" />
                                ) : (
                                    <Circle className="size-4 text-zinc-200 shrink-0" />
                                )}
                                <span
                                    className={cn(
                                        step.status === "running" ? "text-zinc-900 font-semibold" : "text-zinc-500"
                                    )}
                                >
                                    {STEP_LABELS[step.step as AgentStepName] ?? step.message}
                                </span>
                                {step.detail && (
                                    <span className="text-[10px] font-medium text-zinc-400 ml-auto bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">{step.detail}</span>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function ChatInterface({
    sessionKey,
    initialUserPrompt,
    mode,
    setMode,
    slideGeneration,
    webpageGeneration,
    knowledgeGraphGeneration,
    studyYtGeneration,
}: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const [kgDepth, setKgDepth] = useState(2);
    const [selectedTheme, setSelectedTheme] = useState("emerald-modern");
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);

    const THEMES = [
        { value: "emerald-modern", label: "Emerald Modern", color: "#10b981" },
        { value: "ocean-blue", label: "Ocean Blue", color: "#0284c7" },
        { value: "sunset-warm", label: "Sunset Warm", color: "#f97316" },
        { value: "royal-purple", label: "Royal Purple", color: "#7c3aed" },
        { value: "rose-cream", label: "Rose Cream", color: "#e11d48" },
        { value: "slate-mono", label: "Slate Mono", color: "#334155" },
        { value: "modern-dark", label: "Modern Dark", color: "#6366f1" },
        { value: "minimal-light", label: "Minimal Light", color: "#2563eb" },
        { value: "corporate", label: "Corporate", color: "#0369a1" },
        { value: "vibrant", label: "Vibrant", color: "#e94560" },
    ];
	    const messagesEndRef = useRef<HTMLDivElement>(null);
	    const themeMenuRef = useRef<HTMLDivElement>(null);
	    const hasAddedResult = useRef(false);

    // Close theme menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
                setShowThemeMenu(false);
            }
        };
        
        if (showThemeMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showThemeMenu]);

    // Reset chat when the user starts a new session or loads history
    useEffect(() => {
        setInput("");
        setKgDepth(2);
        setSelectedTheme("emerald-modern");
        setShowThemeMenu(false);
        setMessages(
            initialUserPrompt
                ? [
                    {
                        id: "history-prompt",
                        role: "user",
                        content: initialUserPrompt,
                    },
                ]
                : []
        );
        hasAddedResult.current = false;
    }, [sessionKey, initialUserPrompt]);

    const currentGen =
        mode === "slides"
            ? slideGeneration
            : mode === "webpage"
                ? webpageGeneration
                : mode === "study-yt"
                    ? studyYtGeneration
                : knowledgeGraphGeneration;
    const isGenerating =
        slideGeneration.status === "generating" ||
        webpageGeneration.status === "generating" ||
        knowledgeGraphGeneration.status === "generating" ||
        studyYtGeneration.status === "generating";

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
            const links: Array<{ label: string; href: string }> = [];
            if (r.hasWeb) links.push({ label: "Open", href: `/presentation/${r.deckId}` });
            if (r.hasPptx) links.push({ label: "Download PPTX", href: `/api/export?id=${r.deckId}` });
            setMessages((prev) => [
                ...prev,
                {
                    id: `result-${Date.now()}`,
                    role: "assistant",
                    content: `"${r.title}" is ready.`,
                    type: "result",
                    links,
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
                    content: `"${r.title}" is ready.`,
                    type: "result",
                    links: [{ label: "Open", href: `/api/output-html?id=${r.pageId}` }],
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
                    content: `"${r.title}" is ready (${nodeCount} nodes, ${edgeCount} edges).`,
                    type: "result",
                    links: [{ label: "Open", href: `/api/output-html?id=${r.graphId}` }],
                },
            ]);
        }
    }, [knowledgeGraphGeneration.status, knowledgeGraphGeneration.result]);

    // Study YT result
    useEffect(() => {
        if (studyYtGeneration.status === "complete" && studyYtGeneration.result && !hasAddedResult.current) {
            hasAddedResult.current = true;
            const r = studyYtGeneration.result;
            setMessages((prev) => [
                ...prev,
                {
                    id: `result-${Date.now()}`,
                    role: "assistant",
                    content: `"${r.title}" is ready.`,
                    type: "result",
                    links: [{ label: "Open", href: `/api/output-html?id=${r.pageId}` }],
                },
            ]);
        }
    }, [studyYtGeneration.status, studyYtGeneration.result]);

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

    useEffect(() => {
        if (studyYtGeneration.status === "error" && studyYtGeneration.error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: `Something went wrong: ${studyYtGeneration.error}`,
                    type: "error",
                },
            ]);
        }
    }, [studyYtGeneration.status, studyYtGeneration.error]);

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;

        const modeLabel =
            mode === "slides"
                ? "Slides"
                : mode === "webpage"
                    ? "Webpage"
                    : mode === "study-yt"
                        ? "Study YT"
                        : "Knowledge Graph";

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
            slideGeneration.generate(prompt, selectedTheme);
        } else if (mode === "webpage") {
            webpageGeneration.generate(prompt);
        } else if (mode === "study-yt") {
            studyYtGeneration.generate(prompt);
        } else {
            knowledgeGraphGeneration.generate(prompt, kgDepth);
        }
    };

    const placeholders: Record<OutputMode, string> = {
        slides: "Describe your presentation...",
        webpage: "Describe the webpage you want (topic, data, style)...",
        "knowledge-graph": "Enter a topic to map as a knowledge graph...",
        "study-yt": "Paste a YouTube link (or video ID)…",
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 space-y-8 pb-44">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                            className={cn(
                                "flex max-w-3xl mx-auto",
                                msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
	                            <div className={cn("space-y-1.5 min-w-0 w-full max-w-[85%]", msg.role === "user" ? "text-right" : "")}>
		                                <div className="relative">
		                                    <span
		                                        className={cn(
		                                            "absolute -top-1 size-2.5 rotate-45 border",
		                                            msg.role === "user"
		                                                ? "right-4 bg-zinc-100 border-zinc-200/50"
		                                                : "left-4 bg-white border-zinc-200/70",
		                                        )}
		                                    />
		                                <div
		                                    className={cn(
                                        "relative z-10 inline-block max-w-full rounded-2xl text-[15px] transition-all whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                                        msg.role === "user"
                                            ? "bg-zinc-100 text-zinc-900 px-5 py-3 border border-zinc-200/50 shadow-sm"
                                            : "bg-white text-zinc-800 px-5 py-3 border border-zinc-200/70 shadow-sm leading-relaxed",
                                        msg.type === "error" && "text-red-600"
                                    )}
                                >
                                    {msg.content}
                                </div>
		                                </div>
	                                    {msg.links && msg.links.length > 0 && (
	                                        <div className={cn("mt-2 flex flex-wrap gap-2", msg.role === "user" && "justify-end")}>
	                                            {msg.links.map((link) => (
                                                <a
                                                    key={link.href}
                                                    href={link.href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                                                >
                                                    {link.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
	                            </div>
	                        </motion.div>
	                    ))}
                </AnimatePresence>

                {/* Live pipeline progress */}
		                {isGenerating && currentGen.progress.length > 0 && (
		                    <div className="max-w-3xl mx-auto">
		                        <div className="space-y-2">
		                            <ProgressTracker progress={currentGen.progress} />
		                        </div>
		                    </div>
		                )}

		                {isGenerating && currentGen.progress.length === 0 && (
		                    <div className="max-w-3xl mx-auto">
		                        <div className="space-y-2">
		                            <div className="flex items-center gap-2 text-zinc-500 text-sm bg-zinc-50 p-4 rounded-2xl border border-zinc-200/50">
		                                <span className="relative flex size-2">
		                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                                </span>
                                Connecting to pipeline...
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
	            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
                <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-900/5 p-3 flex flex-col gap-2 relative ring-1 ring-zinc-900/5 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
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
                        className="w-full resize-none bg-transparent outline-none text-zinc-900 placeholder:text-zinc-400 min-h-[48px] max-h-[200px] py-3 px-3 font-medium text-sm"
                        rows={1}
                    />

	                    <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
	                        {/* Mode toggle */}
		                        <div className="flex flex-wrap items-center gap-1 bg-zinc-100/50 rounded-xl p-1 border border-zinc-200/50">
		                            {(["slides", "webpage", "study-yt", "knowledge-graph"] as const).map((m) => (
		                                <button
		                                    key={m}
		                                    onClick={() => setMode(m)}
                                    disabled={isGenerating}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                                        mode === m
                                            ? "bg-white text-emerald-600 shadow-sm border border-zinc-200"
                                            : "text-zinc-400 hover:text-zinc-600"
                                    )}
                                >
                                    {m === "slides" ? (
                                        <Presentation className="size-3.5" />
                                    ) : m === "webpage" ? (
                                        <Globe className="size-3.5" />
                                    ) : m === "study-yt" ? (
                                        <Youtube className="size-3.5" />
                                    ) : (
                                        <Network className="size-3.5" />
                                    )}
                                    {m === "knowledge-graph" ? "Graph" : m === "study-yt" ? "Study YT" : m === "webpage" ? "Web" : "Slides"}
                                </button>
		                            ))}
		                        </div>

	                        <div className="flex flex-wrap items-center justify-end gap-2">
	                            {mode === "slides" && (
	                                <div className="relative" ref={themeMenuRef}>
	                                    <button
	                                        onClick={() => setShowThemeMenu(!showThemeMenu)}
	                                        disabled={isGenerating}
	                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:border-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	                                    >
	                                        <div
	                                            className="size-3.5 rounded border border-zinc-300 shrink-0"
	                                            style={{ backgroundColor: THEMES.find(t => t.value === selectedTheme)?.color }}
	                                        />
	                                        <span className="whitespace-nowrap">{THEMES.find(t => t.value === selectedTheme)?.label}</span>
	                                    </button>
	                                    
	                                    {showThemeMenu && (
	                                        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl border border-zinc-200 shadow-2xl p-2 w-56 max-h-80 overflow-y-auto z-50">
	                                            <div className="space-y-1">
	                                                {THEMES.map((theme) => (
	                                                    <button
	                                                        key={theme.value}
	                                                        onClick={() => {
	                                                            setSelectedTheme(theme.value);
	                                                            setShowThemeMenu(false);
	                                                        }}
	                                                        className={cn(
	                                                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
	                                                            selectedTheme === theme.value
	                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
	                                                                : "hover:bg-zinc-50 text-zinc-700 border border-transparent"
	                                                        )}
	                                                    >
	                                                        <div
	                                                            className="size-4 rounded border border-zinc-300 shrink-0"
	                                                            style={{ backgroundColor: theme.color }}
	                                                        />
	                                                        <span>{theme.label}</span>
	                                                    </button>
	                                                ))}
	                                            </div>
	                                        </div>
	                                    )}
	                                </div>
	                            )}
	                            
	                            {mode === "knowledge-graph" && (
	                                <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
	                                    <span className="mr-1">Depth</span>
	                                    {[1, 2, 3].map((d) => (
	                                        <button
	                                            key={d}
                                            onClick={() => setKgDepth(d)}
                                            disabled={isGenerating}
                                            className={cn(
                                                "size-6 rounded-lg transition-all",
                                                kgDepth === d
                                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                                                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                            )}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSend}
                                disabled={!input.trim() || isGenerating}
                                className={cn(
                                    "size-10 flex items-center justify-center rounded-xl transition-all duration-200",
                                    input.trim() && !isGenerating
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                                        : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                                )}
                            >
                                <SendHorizontal className="size-5" />
                            </motion.button>
                        </div>
                    </div>
	                </div>
	            </div>
	        </div>
	    );
	}
