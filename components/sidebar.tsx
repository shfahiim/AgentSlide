import { Plus, Layout, Settings, Inbox } from "lucide-react";

export function Sidebar() {
    return (
        <aside className="w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col h-full shrink-0">
            {/* Brand */}
            <div className="p-4 flex items-center gap-2 border-b border-zinc-200/50">
                <div className="size-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <Layout className="text-white size-4" />
                </div>
                <span className="font-semibold text-sm tracking-tight">PresentAI</span>
            </div>

            {/* New Presentation */}
            <div className="p-4">
                <button className="w-full flex items-center gap-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                    <Plus className="size-4" />
                    <span>New Presentation</span>
                </button>
            </div>

            {/* History — empty state */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="text-xs font-medium text-zinc-400 px-2 py-1 mb-1 uppercase tracking-wider">
                    History
                </div>
                <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                    <Inbox className="size-6 mb-2 opacity-40" />
                    <p className="text-xs text-center">No presentations yet</p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200">
                <button className="w-full flex items-center gap-2 px-2 py-2 text-sm text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors">
                    <Settings className="size-4" />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
}
