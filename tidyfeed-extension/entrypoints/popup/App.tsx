import { useState, useEffect } from 'react';
import { useStorageValue } from './useStorageValue';

// User info type
interface UserInfo {
  id?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

// Backend URL
const BACKEND_URL = 'https://api.tidyfeed.app';

function App() {
  const adsBlocked = useStorageValue<number>('stats_ads_blocked', 0);
  const blockedKeywords = useStorageValue<string[]>('user_blocked_keywords', []);
  const enableRegex = useStorageValue<boolean>('enable_regex_filter', false);
  const cloudRegexList = useStorageValue<string[]>('cloud_regex_list', []);
  const autoDownloadVideos = useStorageValue<boolean>('settings_auto_download_video', false);

  const [inputValue, setInputValue] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isLoggedIn = !!userInfo;

  // Check auth status on mount by calling /auth/me
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include', // Send HttpOnly cookies
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[TidyFeed] Auth check successful:', data);
          // API returns user object with camelCase fields
          const user = data.user || data;
          setUserInfo({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatarUrl || user.avatar_url || user.picture, // API uses camelCase
          });
          await browser.storage.local.set({ user_type: 'authenticated' });
        } else {
          console.log('[TidyFeed] Not logged in');
          setUserInfo(null);
          await browser.storage.local.set({ user_type: 'guest' });
        }
      } catch (error) {
        console.error('[TidyFeed] Auth check error:', error);
        setUserInfo(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Open Google OAuth login in new tab
  const handleGoogleLogin = () => {
    setLoginError(null);
    chrome.tabs.create({ url: `${BACKEND_URL}/auth/login/google` });
  };

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to clear cookies
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[TidyFeed] Logout request error:', error);
    }

    // Clear local state
    setUserInfo(null);
    await browser.storage.local.set({ user_type: 'guest' });
    console.log('[TidyFeed] Logged out');
  };

  const handleGoToDashboard = () => {
    chrome.tabs.create({ url: 'https://a.tidyfeed.app/dashboard' });
  };

  const handleToggleRegex = () => {
    browser.storage.local.set({ enable_regex_filter: !enableRegex });
  };

  const handleToggleAutoDownload = () => {
    browser.storage.local.set({ settings_auto_download_video: !autoDownloadVideos });
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
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">TidyFeed</h1>
          <p className="text-[10px] text-white/70 font-medium">Clean your timeline</p>
        </div>
        {/* User Section in Header */}
        {isLoggedIn && userInfo && (
          <div className="flex items-center gap-2">
            {userInfo.avatar_url ? (
              <img
                src={userInfo.avatar_url}
                alt={userInfo.name || 'User'}
                className="w-8 h-8 rounded-full border-2 border-white/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {userInfo.name?.charAt(0) || userInfo.email?.charAt(0) || '?'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Auth Section */}
        {!isLoggedIn ? (
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-800/50 rounded-xl p-5 border border-zinc-700/50">
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-3">Sign in to sync your settings</div>
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 px-4 py-2.5 rounded-lg font-medium hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {authLoading ? (
                  <span className="animate-pulse">Checking...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Login with Google
                  </>
                )}
              </button>
              {loginError && (
                <div className="mt-2 text-xs text-red-400">{loginError}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userInfo?.avatar_url ? (
                  <img
                    src={userInfo.avatar_url}
                    alt={userInfo.name || 'User'}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      console.error('[TidyFeed] Avatar load failed:', userInfo.avatar_url);
                      // Fallback to initials on error
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => console.log('[TidyFeed] Avatar loaded successfully')}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-lg font-bold">
                    {userInfo?.name?.charAt(0) || userInfo?.email?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-white">{userInfo?.name || 'User'}</div>
                  <div className="text-[10px] text-zinc-500">{userInfo?.email}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleGoToDashboard}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}

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

        {/* Auto-download Videos Toggle */}
        <div className="bg-zinc-800/60 rounded-lg p-4 border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <span>☁️</span>
                <span>Auto-download Videos</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Save videos to cloud when bookmarking
              </div>
            </div>
            <button
              onClick={handleToggleAutoDownload}
              className={`w-11 h-6 rounded-full relative transition-colors ${autoDownloadVideos ? 'bg-purple-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${autoDownloadVideos ? 'translate-x-5' : 'translate-x-0'}`} />
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

