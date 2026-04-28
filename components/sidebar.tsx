import {
    Settings,
    Inbox,
    PanelLeftClose,
    PanelLeftOpen,
    SquareStack,
    Globe,
    Network,
    Trash2,
    Search,
    User,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HistoryListItem } from "@/lib/hooks/use-history";
import { Logo, LogoIcon } from "./logo";
import { useState, useMemo } from "react";

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
    if (mode === "slides") return SquareStack;
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

function groupHistory(items: HistoryListItem[]) {
    const groups: { title: string; items: HistoryListItem[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const todayItems = items.filter(item => item.createdAt >= today);
    const yesterdayItems = items.filter(item => item.createdAt >= yesterday && item.createdAt < today);
    const olderItems = items.filter(item => item.createdAt < yesterday);

    if (todayItems.length > 0) groups.push({ title: "Today", items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: "Yesterday", items: yesterdayItems });
    if (olderItems.length > 0) groups.push({ title: "Older", items: olderItems });

    return groups;
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
    const collapsedWidth = 72;
    const expandedWidth = 280;
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return historyItems;
        const q = searchQuery.toLowerCase();
        return historyItems.filter(
            item => 
                item.title.toLowerCase().includes(q) || 
                (item.prompt || "").toLowerCase().includes(q)
        );
    }, [historyItems, searchQuery]);

    const groupedItems = useMemo(() => groupHistory(filteredItems), [filteredItems]);

    return (
        <motion.aside 
            initial={false}
            animate={{ width: isCollapsed ? collapsedWidth : expandedWidth }}
            className="bg-white border-r border-zinc-200 flex flex-col h-full shrink-0 relative"
        >
            {/* Logo */}
            <div
                className={cn(
                    "h-16 border-b border-zinc-100/50 flex items-center text-emerald-600",
                    isCollapsed ? "justify-center px-2" : "px-4"
                )}
            >
                {isCollapsed ? <LogoIcon className="h-6 w-6" /> : <Logo className="h-8" />}
            </div>

            {/* Top Controls */}
            <div
                className={cn(
                    "h-12 flex items-center",
                    isCollapsed ? "justify-center px-2" : "justify-between px-3"
                )}
            >
                {!isCollapsed && (
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                        Workspace
                    </span>
                )}
                <button
                    onClick={onToggle}
                    className={cn(
                        "size-8 rounded-lg flex items-center justify-center border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-colors"
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
                        "h-11 rounded-xl border-2 border-dashed border-zinc-200 bg-white hover:bg-zinc-50 hover:border-emerald-200 text-zinc-400 hover:text-emerald-600 font-bold flex items-center justify-center transition-all active:scale-95 group",
                        isCollapsed ? "size-11 mx-auto" : "w-full gap-2"
                    )}
                    title="New creation"
                >
                    <Plus className="size-4 group-hover:rotate-90 transition-transform duration-200" />
                    {!isCollapsed && <span className="text-sm">New Creation</span>}
                </button>
            </div>

            {/* Search */}
            {!isCollapsed && (
                <div className="px-4 mb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* History */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {!isCollapsed && (
                    <>
                        {historyStatus === "loading" && historyItems.length === 0 ? (
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
                            <div className="space-y-6">
                                {groupedItems.map((group) => (
                                    <div key={group.title} className="space-y-1">
                                        <div className="text-[10px] font-bold text-zinc-400 px-3 py-1 uppercase tracking-widest">
                                            {group.title}
                                        </div>
                                        {group.items.map((item) => {
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
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    onDeleteHistory(item.id);
                                                                }}
                                                                className={cn(
                                                                    "ml-auto size-7 rounded-lg border flex items-center justify-center transition-all",
                                                                    "opacity-0 group-hover:opacity-100",
                                                                    isActive
                                                                        ? "border-emerald-200 text-emerald-700 hover:bg-white"
                                                                        : "border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:bg-white"
                                                                )}
                                                                title="Remove from history"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                                                                {formatDate(item.createdAt)}
                                                            </span>
                                                            {(item.subtitle || item.prompt) && (
                                                                <span className="text-[11px] text-zinc-400 truncate opacity-60">
                                                                    • {item.subtitle ?? item.prompt}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className={cn("p-4 border-t border-zinc-100 space-y-2", isCollapsed && "p-2")}>
                <div className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-xl transition-colors",
                    isCollapsed ? "justify-center" : "bg-zinc-50/50 border border-zinc-200/50"
                )}>
                    <div className="size-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                        <User className="size-4 text-emerald-600" />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-900 truncate">Guest User</p>
                            <p className="text-[10px] text-zinc-500 truncate">Free Plan</p>
                        </div>
                    )}
                </div>
                
                <button
                    className={cn(
                        "flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors w-full",
                        isCollapsed ? "justify-center size-10 p-0 mx-auto" : "px-2 py-2"
                    )}
                >
                    <Settings className="size-4 shrink-0" />
                    {!isCollapsed && <span className="text-xs font-medium">Settings</span>}
                </button>
            </div>
        </motion.aside>
    );
}
