import { useState } from 'react';
import { useStorageValue } from './useStorageValue';

function App() {
  const adsBlocked = useStorageValue<number>('stats_ads_blocked', 0);
  const blockedKeywords = useStorageValue<string[]>('user_blocked_keywords', []);
  const enableRegex = useStorageValue<boolean>('enable_regex_filter', false);
  const cloudRegexList = useStorageValue<string[]>('cloud_regex_list', []);
  const [inputValue, setInputValue] = useState('');

  const handleToggleRegex = () => {
    browser.storage.local.set({ enable_regex_filter: !enableRegex });
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
    browser.storage.local.set({ user_blocked_keywords: newKeywords });
    setInputValue('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const newKeywords = blockedKeywords.filter(k => k !== keywordToRemove);
    browser.storage.local.set({ user_blocked_keywords: newKeywords });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddKeyword();
    }
  };

  const handleSyncRules = () => {
    browser.runtime.sendMessage({ type: 'FORCE_REGEX_SYNC' });
  };

  return (
    <div className="w-[350px] bg-zinc-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <span className="text-lg">✨</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">TidyFeed</h1>
          <p className="text-[10px] text-white/70 font-medium">Clean your timeline</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Bento Card */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-800/50 rounded-xl p-5 border border-zinc-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-1">
              Items Blocked
            </div>
            <div className="text-5xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent tabular-nums">
              {adsBlocked.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* AI Smart Filter Toggle */}
        <div className="bg-zinc-800/60 rounded-lg p-4 border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <span>🤖</span>
                <span>AI Smart Filter</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-zinc-500">
                  {cloudRegexList.length > 0 ? `${cloudRegexList.length} rules loaded` : 'Connecting...'}
                </span>
                <button
                  onClick={handleSyncRules}
                  className="text-zinc-500 hover:text-purple-400 transition-colors text-xs"
                  title="Sync rules"
                >
                  🔄
                </button>
              </div>
            </div>
            <button
              onClick={handleToggleRegex}
              className={`w-11 h-6 rounded-full relative transition-colors ${enableRegex ? 'bg-purple-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${enableRegex ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Keyword Manager */}
        <div className="bg-zinc-800/60 rounded-lg p-4 border border-zinc-700/50">
          <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
            <span>🛡️</span>
            <span>Keyword Filter</span>
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add keyword..."
              className="flex-1 bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
            <button
              onClick={handleAddKeyword}
              disabled={!inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>

          {/* Keywords List */}
          {blockedKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
              {blockedKeywords.map((keyword, idx) => (
                <span
                  key={`${keyword}-${idx}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-xs text-zinc-300 group hover:border-red-500/30 transition-colors"
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
          ) : (
            <p className="text-xs text-zinc-600 italic">
              No keywords blocked yet
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-zinc-600 pt-1">
          v0.0.1 • Made with ❤️
        </div>
      </div>
    </div>
  );
}

export default App;
