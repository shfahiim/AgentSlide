import {
    Plus,
    Layout,
    Settings,
    Inbox,
    ChevronsLeft,
    ChevronsRight,
    Presentation,
    Globe,
    Network,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HistoryListItem } from "@/lib/hooks/use-history";

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
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
    historyItems,
    historyStatus = "idle",
    onNew,
    onSelectHistory,
    onDeleteHistory,
    activeHistoryId,
}: SidebarProps) {
    return (
        <motion.aside 
            initial={false}
            animate={{ width: isCollapsed ? 64 : 256 }}
            className="bg-white border-r border-zinc-200 flex flex-col h-full shrink-0 relative"
        >
            {/* Brand (Top toggle) */}
            <button
                onClick={onToggle}
                className={cn(
                    "p-4 flex items-center gap-2 border-b border-zinc-100/50 h-14 w-full text-left hover:bg-zinc-50 transition-colors",
                    isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-200 shrink-0">
                    <Layout className="text-white size-4" />
                </div>
                {!isCollapsed && (
                    <span className="font-semibold text-sm tracking-tight text-zinc-900 truncate">
                        PresentAI
                    </span>
                )}
            </button>

            {/* New Presentation */}
            <div className="p-4">
                <button
                    onClick={onNew}
                    className={cn(
                    "flex items-center gap-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm active:scale-[0.98] w-full",
                    isCollapsed ? "justify-center size-10 p-0" : "px-3 py-2"
                )}>
                    <Plus className="size-4 shrink-0" />
                    {!isCollapsed && <span>New Presentation</span>}
                </button>
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
            <div className="p-4 border-t border-zinc-100 space-y-2">
                <button
                    className={cn(
                        "flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors w-full",
                        isCollapsed ? "justify-center size-10 p-0" : "px-2 py-2"
                    )}
                >
                    <Settings className="size-4 shrink-0" />
                    {!isCollapsed && <span>Settings</span>}
                </button>

                {/* Bottom toggle (<< / >>) */}
                <button
                    onClick={onToggle}
                    className={cn(
                        "flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors w-full border border-zinc-200 bg-white",
                        isCollapsed ? "justify-center size-10 p-0" : "px-2 py-2"
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronsRight className="size-4 shrink-0" />
                    ) : (
                        <ChevronsLeft className="size-4 shrink-0" />
                    )}
                    {!isCollapsed && <span>{isCollapsed ? "Expand" : "Collapse"}</span>}
                </button>
            </div>
        </motion.aside>
    );
}
