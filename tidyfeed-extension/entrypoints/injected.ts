/**
 * TidyFeed Network Interceptor - Main World Script
 * 
 * This script runs in the page's Main World to intercept fetch requests
 * and capture complete tweet data from X's GraphQL API responses.
 * 
 * It monkey-patches window.fetch to capture responses from:
 * - HomeTimeline
 * - HomeLatestTimeline  
 * - TweetDetail
 * - UserTweets
 * - SearchTimeline
 */

export default defineUnlistedScript(() => {
    const LOG_PREFIX = '[TidyFeed Interceptor]';

    // GraphQL endpoints to intercept
    const INTERCEPT_PATTERNS = [
        'HomeTimeline',
        'HomeLatestTimeline',
        'TweetDetail',
        'UserTweets',
        'UserTweetsAndReplies',
        'SearchTimeline',
        'Likes',
        'Bookmarks',
    ];

    /**
     * Extracted tweet data structure
     */
    interface ExtractedTweet {
        id: string;
        fullText: string;
        authorHandle: string;
        authorName: string;
        isNoteTweet: boolean;
        quotedTweet?: {
            id: string;
            fullText: string;
            authorHandle: string;
        };
    }

    /**
     * Check if URL matches any intercept pattern
     */
    function shouldIntercept(url: string): boolean {
        return INTERCEPT_PATTERNS.some(pattern => url.includes(pattern));
    }

    /**
     * Safely get nested property value
     */
    function safeGet(obj: any, path: string[]): any {
        try {
            return path.reduce((current, key) => current?.[key], obj);
        } catch {
            return undefined;
        }
    }

    /**
     * Extract full text from a tweet result object
     * Handles both regular tweets and Note tweets (super long tweets)
     */
    function extractTweetText(tweetResult: any): { fullText: string; isNoteTweet: boolean } | null {
        try {
            // Handle different tweet result structures
            const result = tweetResult?.result || tweetResult;
            if (!result) return null;

            // Handle tweet with visibility results wrapper
            const tweet = result.tweet || result;
            if (!tweet) return null;

            const legacy = tweet.legacy;
            if (!legacy) return null;

            // Check for Note tweet (super long tweets)
            const noteTweet = tweet.note_tweet?.note_tweet_results?.result;
            if (noteTweet?.text) {
                return {
                    fullText: noteTweet.text,
                    isNoteTweet: true,
                };
            }

            // Regular tweet - use full_text from legacy
            if (legacy.full_text) {
                return {
                    fullText: legacy.full_text,
                    isNoteTweet: false,
                };
            }

            return null;
        } catch (error) {
            console.warn(LOG_PREFIX, 'Error extracting tweet text:', error);
            return null;
        }
    }

    /**
     * Extract author info from tweet result
     */
    function extractAuthorInfo(tweetResult: any): { handle: string; name: string } | null {
        try {
            const result = tweetResult?.result || tweetResult;
            const tweet = result?.tweet || result;
            const userResults = tweet?.core?.user_results?.result;

            if (userResults?.legacy) {
                return {
                    handle: userResults.legacy.screen_name || '',
                    name: userResults.legacy.name || '',
                };
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Extract quoted tweet info if present
     */
    function extractQuotedTweet(tweetResult: any): ExtractedTweet['quotedTweet'] | undefined {
        try {
            const result = tweetResult?.result || tweetResult;
            const tweet = result?.tweet || result;
            const quotedStatus = tweet?.quoted_status_result;

            if (!quotedStatus) return undefined;

            const textInfo = extractTweetText(quotedStatus);
            const authorInfo = extractAuthorInfo(quotedStatus);
            const quotedTweet = quotedStatus.result?.tweet || quotedStatus.result;
            const id = quotedTweet?.rest_id || quotedTweet?.legacy?.id_str;

            if (textInfo && id) {
                return {
                    id,
                    fullText: textInfo.fullText,
                    authorHandle: authorInfo?.handle || '',
                };
            }
            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Extract tweet ID from various locations
     */
    function extractTweetId(tweetResult: any): string | null {
        try {
            const result = tweetResult?.result || tweetResult;
            const tweet = result?.tweet || result;
            return tweet?.rest_id || tweet?.legacy?.id_str || null;
        } catch {
            return null;
        }
    }

    /**
     * Process a single tweet entry and extract data
     */
    function processTweetEntry(entry: any): ExtractedTweet | null {
        try {
            // Different entry structures for different endpoints
            const tweetResults =
                entry?.content?.itemContent?.tweet_results ||
                entry?.item?.itemContent?.tweet_results ||
                entry?.tweetResult ||
                entry;

            const tweetId = extractTweetId(tweetResults);
            if (!tweetId) return null;

            const textInfo = extractTweetText(tweetResults);
            if (!textInfo) return null;

            const authorInfo = extractAuthorInfo(tweetResults);
            const quotedTweet = extractQuotedTweet(tweetResults);

            return {
                id: tweetId,
                fullText: textInfo.fullText,
                authorHandle: authorInfo?.handle || '',
                authorName: authorInfo?.name || '',
                isNoteTweet: textInfo.isNoteTweet,
                quotedTweet,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Recursively search for tweet entries in the response data
     */
    function findTweetEntries(data: any, depth = 0, maxDepth = 10): any[] {
        if (depth > maxDepth || !data || typeof data !== 'object') {
            return [];
        }

        const entries: any[] = [];

        // Check for entries array (timeline format)
        if (Array.isArray(data.entries)) {
            entries.push(...data.entries);
        }

        // Check for instructions array (home timeline format)
        if (Array.isArray(data.instructions)) {
            for (const instruction of data.instructions) {
                if (instruction.entries) {
                    entries.push(...instruction.entries);
                }
                if (instruction.moduleItems) {
                    entries.push(...instruction.moduleItems);
                }
            }
        }

        // Check for direct tweet result (TweetDetail format)
        if (data.tweetResult || data.tweet_result) {
            entries.push(data);
        }

        // Recurse into nested objects if we haven't found entries yet
        if (entries.length === 0) {
            for (const key of Object.keys(data)) {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    entries.push(...findTweetEntries(data[key], depth + 1, maxDepth));
                }
            }
        }

        return entries;
    }

    /**
     * Process complete API response and extract all tweets
     */
    function processApiResponse(data: any): ExtractedTweet[] {
        const tweets: ExtractedTweet[] = [];
        const seenIds = new Set<string>();

        try {
            const entries = findTweetEntries(data);

            for (const entry of entries) {
                const tweet = processTweetEntry(entry);
                if (tweet && !seenIds.has(tweet.id)) {
                    seenIds.add(tweet.id);
                    tweets.push(tweet);

                    // Also cache quoted tweet if present
                    if (tweet.quotedTweet && !seenIds.has(tweet.quotedTweet.id)) {
                        seenIds.add(tweet.quotedTweet.id);
                        tweets.push({
                            id: tweet.quotedTweet.id,
                            fullText: tweet.quotedTweet.fullText,
                            authorHandle: tweet.quotedTweet.authorHandle,
                            authorName: '',
                            isNoteTweet: false,
                        });
                    }
                }
            }
        } catch (error) {
            console.error(LOG_PREFIX, 'Error processing API response:', error);
        }

        return tweets;
    }

    /**
     * Send extracted tweets to Content Script
     */
    function sendToContentScript(tweets: ExtractedTweet[]): void {
        if (tweets.length === 0) return;

        window.postMessage({
            type: 'TIDYFEED_TWEET_DATA',
            tweets,
        }, '*');

        // Silently send to content script
    }

    /**
     * Monkey-patch window.fetch to intercept responses
     */
    const originalFetch = window.fetch;

    // Main World cache for debugging access from console
    const mainWorldCache = new Map<string, { fullText: string; authorHandle: string }>();
    (window as any).__tidyfeedTweetCache = mainWorldCache;
    (window as any).__tidyfeedGetTweet = (id: string) => mainWorldCache.get(id);

    // Debug mode - set to false for production
    const debugMode = false;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

        // Debug: log graphql requests
        if (debugMode && url.includes('/graphql/')) {
            console.log(LOG_PREFIX, '📡 GraphQL request:', url.split('?')[0].split('/').pop());
        }

        // Call original fetch
        const response = await originalFetch.call(this, input, init);

        // Check if this is a request we want to intercept
        if (shouldIntercept(url)) {
            try {
                // Clone response to avoid consuming the body
                const clonedResponse = response.clone();

                // Process in background to not block the main thread
                clonedResponse.json().then((data: any) => {
                    const tweets = processApiResponse(data);

                    // Store in Main World cache for debugging
                    for (const tweet of tweets) {
                        mainWorldCache.set(tweet.id, {
                            fullText: tweet.fullText,
                            authorHandle: tweet.authorHandle,
                        });

                        // Limit cache size
                        if (mainWorldCache.size > 500) {
                            const firstKey = mainWorldCache.keys().next().value;
                            if (firstKey) mainWorldCache.delete(firstKey);
                        }
                    }

                    if (tweets.length > 0) {
                        sendToContentScript(tweets);
                    }
                }).catch((error: any) => {
                    // Silently ignore JSON parse errors (some responses might not be JSON)
                    console.debug(LOG_PREFIX, 'Could not parse response as JSON:', error.message);
                });
            } catch (error) {
                // Never let interceptor errors affect the page
                console.error(LOG_PREFIX, 'Intercept error:', error);
            }
        }

        return response;
    };

    // Also intercept XMLHttpRequest in case X uses it
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
        (this as any)._tidyfeedUrl = url.toString();
        return originalXHROpen.apply(this, [method, url, ...args] as any);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        const url = (this as any)._tidyfeedUrl || '';

        if (debugMode && url.includes('/graphql/')) {
            console.log(LOG_PREFIX, '📡 XHR GraphQL request:', url.split('?')[0].split('/').pop());
        }

        if (shouldIntercept(url)) {
            this.addEventListener('load', function () {
                try {
                    const data = JSON.parse(this.responseText);
                    const tweets = processApiResponse(data);

                    for (const tweet of tweets) {
                        mainWorldCache.set(tweet.id, {
                            fullText: tweet.fullText,
                            authorHandle: tweet.authorHandle,
                        });

                        // Simple LRU-like eviction if cache grows too large
                        if (mainWorldCache.size > 500) {
                            const firstKey = mainWorldCache.keys().next().value;
                            if (firstKey) mainWorldCache.delete(firstKey);
                        }
                    }

                    if (tweets.length > 0) {
                        sendToContentScript(tweets);
                    }
                } catch (e) {
                    // Ignore errors
                }
            }, { once: true }); // Important: auto-remove listener to prevent memory leaks
        }

        return originalXHRSend.call(this, body);
    };

    // Interceptors installed silently
});

