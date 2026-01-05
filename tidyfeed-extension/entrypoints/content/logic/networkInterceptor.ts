/**
 * TidyFeed Network Interceptor - Content Script Listener
 * 
 * Receives intercepted tweet data from the Main World injected script
 * and provides an API for other modules to access the full tweet text.
 */

const LOG_PREFIX = '[TidyFeed NetworkInterceptor]';

/**
 * Cached tweet data structure
 */
export interface CachedTweet {
    id: string;
    fullText: string;
    authorHandle: string;
    authorName: string;
    isNoteTweet: boolean;
    timestamp: number;
}

/**
 * Tweet data cache - Maps tweet ID to full tweet data
 * Also exposed on window for debugging: window.__tidyfeedTweetCache
 */
const tweetCache = new Map<string, CachedTweet>();

// Cache expiration time (1 hour)
const CACHE_EXPIRY_MS = 60 * 60 * 1000;

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 5000;

/**
 * Clean up expired entries from the cache
 */
function cleanupCache(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [id, tweet] of tweetCache.entries()) {
        if (now - tweet.timestamp > CACHE_EXPIRY_MS) {
            tweetCache.delete(id);
            deletedCount++;
        }
    }

    // If cache is still too large, remove oldest entries
    if (tweetCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(tweetCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = entries.slice(0, tweetCache.size - MAX_CACHE_SIZE);
        for (const [id] of toRemove) {
            tweetCache.delete(id);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(LOG_PREFIX, `Cleaned up ${deletedCount} cached tweets`);
    }
}

/**
 * Handle incoming tweet data from the injected script
 */
function handleTweetData(event: MessageEvent): void {
    // Only accept messages from the page itself
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.type !== 'TIDYFEED_TWEET_DATA') return;

    const tweets = data.tweets as Array<{
        id: string;
        fullText: string;
        authorHandle: string;
        authorName: string;
        isNoteTweet: boolean;
    }>;

    if (!Array.isArray(tweets)) return;

    const now = Date.now();
    let newCount = 0;
    let updateCount = 0;

    for (const tweet of tweets) {
        if (!tweet.id || !tweet.fullText) continue;

        const existing = tweetCache.get(tweet.id);
        if (!existing) {
            newCount++;
        } else {
            updateCount++;
        }

        tweetCache.set(tweet.id, {
            id: tweet.id,
            fullText: tweet.fullText,
            authorHandle: tweet.authorHandle || '',
            authorName: tweet.authorName || '',
            isNoteTweet: tweet.isNoteTweet || false,
            timestamp: now,
        });
    }

    // Periodic cleanup
    if (tweetCache.size > MAX_CACHE_SIZE * 0.9) {
        cleanupCache();
    }
}

/**
 * Get full text for a specific tweet ID
 * @param tweetId - The tweet ID to look up
 * @returns The full tweet text or null if not found
 */
export function getTweetFullText(tweetId: string): string | null {
    const tweet = tweetCache.get(tweetId);
    if (!tweet) return null;

    // Update timestamp on access (LRU behavior)
    tweet.timestamp = Date.now();
    return tweet.fullText;
}

/**
 * Get complete cached tweet data
 * @param tweetId - The tweet ID to look up
 * @returns The cached tweet data or null if not found
 */
export function getCachedTweet(tweetId: string): CachedTweet | null {
    const tweet = tweetCache.get(tweetId);
    if (!tweet) return null;

    // Update timestamp on access (LRU behavior)
    tweet.timestamp = Date.now();
    return { ...tweet };
}

/**
 * Get all cached tweets
 * Used by bookmarksSync to process pre-loaded tweets
 */
export function getAllCachedTweets(): CachedTweet[] {
    return Array.from(tweetCache.values());
}

/**
 * Check if a tweet is in the cache
 * @param tweetId - The tweet ID to check
 */
export function hasTweet(tweetId: string): boolean {
    return tweetCache.has(tweetId);
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number; oldestMs: number; newestMs: number } {
    if (tweetCache.size === 0) {
        return { size: 0, oldestMs: 0, newestMs: 0 };
    }

    const now = Date.now();
    let oldest = now;
    let newest = 0;

    for (const tweet of tweetCache.values()) {
        if (tweet.timestamp < oldest) oldest = tweet.timestamp;
        if (tweet.timestamp > newest) newest = tweet.timestamp;
    }

    return {
        size: tweetCache.size,
        oldestMs: now - oldest,
        newestMs: now - newest,
    };
}

/**
 * Inject the Main World script
 * Uses synchronous injection to ensure it runs before page makes API calls
 */
async function injectMainWorldScript(): Promise<void> {
    try {
        // Method 1: Try inline script injection for immediate execution
        // Fetch the script content and inject it directly (synchronous execution)
        const scriptUrl = chrome.runtime.getURL('injected.js');

        // Create script element and inject into page
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = false; // Ensure synchronous loading

        // Insert at document_start (before any page scripts)
        const insertTarget = document.documentElement || document.head || document.body;
        if (insertTarget) {
            insertTarget.insertBefore(script, insertTarget.firstChild);
        } else {
            // Fallback: wait for document to be available
            document.addEventListener('DOMContentLoaded', () => {
                (document.head || document.documentElement).appendChild(script);
            }, { once: true });
        }
    } catch (error) {
        console.error(LOG_PREFIX, 'Failed to inject Main World script:', error);
    }
}

/**
 * Initialize the network interceptor
 * - Sets up message listener for data from Main World
 * - Injects the fetch interceptor script into Main World
 */
export async function initNetworkInterceptor(): Promise<void> {
    // Set up message listener
    window.addEventListener('message', handleTweetData);

    // Inject Main World script
    await injectMainWorldScript();

    // Expose cache for debugging (accessible via console)
    (window as any).__tidyfeedTweetCache = tweetCache;
    (window as any).__tidyfeedGetTweet = getTweetFullText;
}

/**
 * Cleanup function (for extension reload/unload)
 */
export function cleanupNetworkInterceptor(): void {
    window.removeEventListener('message', handleTweetData);
    tweetCache.clear();
    delete (window as any).__tidyfeedTweetCache;
    delete (window as any).__tidyfeedGetTweet;
}
