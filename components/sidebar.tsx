import {
    Settings,
    Inbox,
    PanelLeftClose,
    PanelLeftOpen,
    Presentation,
    Globe,
    Network,
    Youtube,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HistoryListItem } from "@/lib/hooks/use-history";
import { OutputMode } from "@/lib/types";
import { Logo, LogoIcon } from "./logo";

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    mode: OutputMode;
    onSetMode: (mode: OutputMode) => void;
    historyItems: HistoryListItem[];
    historyStatus?: "idle" | "loading" | "error";
    onNew: () => void;
    onSelectHistory: (id: string) => void;
    onDeleteHistory: (id: string) => void;
    activeHistoryId?: string;
}

function modeIcon(mode: HistoryListItem["mode"]) {
    if (mode === "slides") return Presentation;
    if (mode === "webpage") return Globe;
    if (mode === "study-yt") return Youtube;
    return Network;
}

function formatDate(ts: number) {
    try {
        return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
        return "";
    }
}

export function Sidebar({
    isCollapsed,
    onToggle,
    mode,
    onSetMode,
    historyItems,
    historyStatus = "idle",
    onNew,
    onSelectHistory,
    onDeleteHistory,
    activeHistoryId,
}: SidebarProps) {
    const collapsedWidth = 72;
    const expandedWidth = 280;

    return (
        <motion.aside 
            initial={false}
            animate={{ width: isCollapsed ? collapsedWidth : expandedWidth }}
            className="bg-white border-r border-zinc-200 flex flex-col h-full shrink-0 relative"
        >
            {/* Logo */}
            <div
                className={cn(
                    "h-14 border-b border-zinc-100/50 flex items-center",
                    isCollapsed ? "justify-center px-2" : "px-4"
                )}
            >
                {isCollapsed ? <LogoIcon className="h-4 w-4" /> : <Logo className="h-5" />}
            </div>

            {/* Top Controls */}
            <div
                className={cn(
                    "h-12 flex items-center",
                    isCollapsed ? "justify-center px-2" : "justify-end px-2"
                )}
            >
                <button
                    onClick={onToggle}
                    className={cn(
                        "size-9 rounded-xl flex items-center justify-center border border-zinc-300/70 bg-zinc-200/70 text-zinc-600 hover:bg-zinc-200 transition-colors"
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <PanelLeftOpen className="size-4" />
                    ) : (
                        <PanelLeftClose className="size-4" />
                    )}
                </button>
            </div>

            {/* New Presentation */}
            <div className={cn("p-4", isCollapsed && "p-2 flex justify-center")}>
                <button
                    onClick={onNew}
                    className={cn(
                        "h-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-black text-2xl leading-none flex items-center justify-center transition-colors active:scale-95",
                        isCollapsed ? "size-10 mx-auto" : "w-full"
                    )}
                    title="New presentation"
                >
                    +
                </button>
            </div>

            {/* Modes */}
            <div className={cn("px-2", isCollapsed && "px-1")}>
                {!isCollapsed && (
                    <div className="text-[10px] font-bold text-zinc-400 px-3 py-1 mb-1 uppercase tracking-widest">
                        Modes
                    </div>
                )}
                <div className={cn("space-y-1", isCollapsed && "flex flex-col items-center")}>
                    {(
                        [
                            { key: "slides" as const, label: "Slides", Icon: Presentation },
                            { key: "webpage" as const, label: "Webpage", Icon: Globe },
                            { key: "knowledge-graph" as const, label: "Graph", Icon: Network },
                        ] satisfies Array<{ key: OutputMode; label: string; Icon: typeof Presentation }>
                    ).map(({ key, label, Icon }) => {
                        const active = mode === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onSetMode(key)}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border",
                                    isCollapsed ? "justify-center px-0" : "",
                                    active
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        : "bg-white border-transparent text-zinc-600 hover:bg-zinc-50 hover:border-zinc-200"
                                )}
                                title={label}
                            >
                                <div
                                    className={cn(
                                        "size-9 rounded-lg flex items-center justify-center shrink-0 border",
                                        active
                                            ? "bg-white border-emerald-200 text-emerald-700"
                                            : "bg-white border-zinc-200 text-zinc-500"
                                    )}
                                >
                                    <Icon className="size-4" />
                                </div>
                                {!isCollapsed && (
                                    <span className="text-sm font-semibold">{label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* History */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {!isCollapsed && (
                    <div className="text-[10px] font-bold text-zinc-400 px-3 py-1 mb-1 uppercase tracking-widest">
                        History
                    </div>
                )}

	                {!isCollapsed ? (
	                    historyStatus === "loading" && historyItems.length === 0 ? (
	                        <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
	                            <Inbox className="size-6 mb-2 opacity-30" />
	                            <p className="text-xs text-center font-medium text-zinc-400">
	                                Loading history…
	                            </p>
	                        </div>
	                    ) : historyItems.length === 0 ? (
	                        <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
	                            <Inbox className="size-6 mb-2 opacity-30" />
	                            <p className="text-xs text-center font-medium text-zinc-400">
	                                No outputs yet
	                            </p>
	                        </div>
	                    ) : (
	                        <div className="space-y-1">
	                            {historyItems.map((item) => {
	                                const Icon = modeIcon(item.mode);
	                                const isActive = item.id === activeHistoryId;
	                                return (
	                                    <div
	                                        key={item.id}
	                                        onClick={() => onSelectHistory(item.id)}
	                                        onKeyDown={(e) => {
	                                            if (e.key === "Enter" || e.key === " ") {
	                                                e.preventDefault();
	                                                onSelectHistory(item.id);
	                                            }
	                                        }}
	                                        role="button"
	                                        tabIndex={0}
	                                        className={cn(
	                                            "group w-full flex items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors border",
	                                            isActive
	                                                ? "bg-emerald-50 border-emerald-200"
	                                                : "bg-white border-transparent hover:bg-zinc-50 hover:border-zinc-200"
	                                        )}
	                                        title={item.title}
	                                    >
	                                        <div
	                                            className={cn(
	                                                "size-9 rounded-lg flex items-center justify-center shrink-0 border",
	                                                isActive
	                                                    ? "bg-white border-emerald-200 text-emerald-700"
	                                                    : "bg-white border-zinc-200 text-zinc-500"
	                                            )}
	                                        >
	                                            <Icon className="size-4" />
	                                        </div>

	                                        <div className="min-w-0 flex-1">
	                                            <div className="flex items-center gap-2">
	                                                <span className="text-sm font-semibold text-zinc-900 truncate">
	                                                    {item.title}
	                                                </span>
	                                                <span className="ml-auto text-[10px] font-bold text-zinc-400 shrink-0">
	                                                    {formatDate(item.createdAt)}
	                                                </span>
	                                                <button
	                                                    type="button"
	                                                    onClick={(e) => {
	                                                        e.preventDefault();
	                                                        e.stopPropagation();
	                                                        onDeleteHistory(item.id);
	                                                    }}
	                                                    className={cn(
	                                                        "ml-1 size-8 rounded-lg border flex items-center justify-center transition-all",
	                                                        "opacity-0 group-hover:opacity-100",
	                                                        isActive
	                                                            ? "border-emerald-200 text-emerald-700 hover:bg-white"
	                                                            : "border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:bg-white"
	                                                    )}
	                                                    title="Remove from history"
	                                                >
	                                                    <Trash2 className="size-4" />
	                                                </button>
	                                            </div>
	                                            {(item.subtitle || item.prompt) && (
	                                                <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
	                                                    {item.subtitle ?? item.prompt}
	                                                </div>
	                                            )}
	                                        </div>
	                                    </div>
	                                );
	                            })}
	                        </div>
	                    )
	                ) : null}
            </div>

            {/* Footer */}
            <div className={cn("p-4 border-t border-zinc-100 space-y-2", isCollapsed && "p-2")}>
                <button
                    className={cn(
                        "flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors w-full",
                        isCollapsed ? "justify-center size-10 p-0 mx-auto" : "px-2 py-2"
                    )}
                >
                    <Settings className="size-4 shrink-0" />
                    {!isCollapsed && <span>Settings</span>}
                </button>
            </div>
        </motion.aside>
    );
}
