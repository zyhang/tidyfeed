import { useStorageValue } from '../hooks/useStorageValue';

export function Sidebar() {
    const adsBlocked = useStorageValue<number>('stats_ads_blocked', 0);
    const blockedKeywords = useStorageValue<string[]>('user_blocked_keywords', []);
    const enableRegex = useStorageValue<boolean>('enable_regex_filter', false);
    const cloudRegexList = useStorageValue<string[]>('cloud_regex_list', []);
    const [inputValue, setInputValue] = useState('');

    const handleToggleRegex = () => {
        chrome.storage.local.set({ enable_regex_filter: !enableRegex });
    };

    const handleAddKeyword = () => {
        const keyword = inputValue.trim();
        if (!keyword) return;

        // Check for duplicates (case-insensitive)
        if (blockedKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
            setInputValue('');
            return;
        }

        const newKeywords = [...blockedKeywords, keyword];
        chrome.storage.local.set({ user_blocked_keywords: newKeywords });
        setInputValue('');
    };

    const handleRemoveKeyword = (keywordToRemove: string) => {
        const newKeywords = blockedKeywords.filter(k => k !== keywordToRemove);
        chrome.storage.local.set({ user_blocked_keywords: newKeywords });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddKeyword();
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-zinc-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-zinc-700/50 overflow-hidden min-w-[240px] max-w-[300px] font-sans antialiased">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center gap-2 shadow-sm">
                <span className="text-lg">✨</span>
                <span className="font-semibold text-sm tracking-wide">TidyFeed</span>
            </div>

            <div className="p-4 space-y-5">
                {/* Ads Stats */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider font-medium px-1">
                        <span>Stats</span>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2.5 border border-zinc-700/50 hover:bg-zinc-800/80 transition-colors">
                        <div className="flex items-center gap-2.5">
                            <span className="text-red-400 text-sm">🚫</span>
                            <span className="text-sm text-zinc-300 font-medium">Ads Blocked</span>
                        </div>
                        <span className="text-lg font-bold text-white tabular-nums tracking-tight">
                            {adsBlocked}
                        </span>
                    </div>
                </div>

                {/* AI Smart Filter */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider font-medium px-1">
                        <span>Advanced</span>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2.5 border border-zinc-700/50">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                                🤖 AI Smart Filter
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500">
                                    {cloudRegexList.length > 0 ? `${cloudRegexList.length} rules` : 'Connecting...'}
                                </span>
                                <button
                                    onClick={() => {
                                        chrome.runtime.sendMessage({ type: 'FORCE_REGEX_SYNC' }, (response) => {
                                            if (response && response.success) {
                                                console.log('[TidyFeed] Manual sync completed, rules:', response.count);
                                            }
                                        });
                                    }}
                                    className="text-zinc-500 hover:text-purple-400 transition-colors p-0.5"
                                    title="Check for updates"
                                >
                                    🔄
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleRegex}
                            className={`w-9 h-5 rounded-full relative transition-colors ${enableRegex ? 'bg-purple-600' : 'bg-zinc-700'}`}
                            title="Blocks advanced spam patterns like 'Link in Bio', 'Crypto scams'"
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${enableRegex ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="w-full h-px bg-zinc-800/50"></div>

                {/* Noise Filter */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider font-medium px-1">
                        <span>🛡️ Noise Filter</span>
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Block keyword..."
                            className="flex-1 bg-zinc-950/50 border border-zinc-700/50 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                        />
                        <button
                            onClick={handleAddKeyword}
                            disabled={!inputValue.trim()}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white px-3 rounded-md text-xs font-medium transition-colors"
                        >
                            Add
                        </button>
                    </div>

                    {/* Keywords List */}
                    {blockedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                            {blockedKeywords.map((keyword, idx) => (
                                <span
                                    key={`${keyword}-${idx}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 border border-zinc-700/50 rounded text-[11px] text-zinc-300 group hover:bg-zinc-700 transition-colors cursor-default"
                                >
                                    {keyword}
                                    <button
                                        onClick={() => handleRemoveKeyword(keyword)}
                                        className="text-zinc-500 hover:text-red-400 focus:outline-none transition-colors ml-0.5"
                                        aria-label={`Remove ${keyword}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    {blockedKeywords.length === 0 && (
                        <p className="text-[11px] text-zinc-600 px-1 italic">
                            No keywords blocked yet.
                        </p>
                    )}
                </div>

                {/* Status indicator */}
                <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-center gap-2 text-[10px] text-zinc-500">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                    <span className="font-medium tracking-wide">ACTIVE</span>
                </div>
            </div>
        </div>
    );
}
