import { useStorageValue } from '../hooks/useStorageValue';

export function Sidebar() {
    const adsBlocked = useStorageValue<number>('stats_ads_blocked', 0);

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-zinc-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-zinc-700/50 overflow-hidden min-w-[200px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center gap-2">
                <span className="text-lg">✨</span>
                <span className="font-semibold text-sm">TidyFeed</span>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-700/30">
                    <div className="flex items-center gap-2">
                        <span className="text-red-400">🚫</span>
                        <span className="text-xs text-zinc-400">Ads Blocked</span>
                    </div>
                    <span className="text-lg font-bold text-white tabular-nums">
                        {adsBlocked}
                    </span>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Active on this page</span>
                </div>
            </div>
        </div>
    );
}
