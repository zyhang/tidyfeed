/**
 * Background script for TidyFeed
 * Handles video URL extraction via Syndication API and main world injection
 */

export default defineBackground(() => {
  // Configuration
  const BACKEND_URL = 'https://api.tidyfeed.app';

  // Cloud Regex Sync Logic
  const REMOTE_REGEX_URL = 'https://tidyfeed.app/regex_rules.json';
  const REGEX_SYNC_ALARM = 'tidyfeed_regex_sync';

  // Function to sync regex rules
  async function syncRegexRules(): Promise<number> {
    try {
      console.log('[TidyFeed] Syncing regex rules from cloud...');
      const response = await fetch(REMOTE_REGEX_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      // Validate data structure (must be array of strings)
      if (Array.isArray(data) && data.every(i => typeof i === 'string')) {
        await browser.storage.local.set({
          cloud_regex_list: data,
          regex_last_updated: Date.now()
        });
        console.log(`[TidyFeed] Regex rules updated: ${data.length} rules`);
        return data.length;
      } else {
        console.error('[TidyFeed] Invalid regex rules format');
        return 0;
      }
    } catch (error) {
      console.error('[TidyFeed] Error syncing regex rules:', error);
      return 0;
    }
  }

  // Saved Posts Sync Logic
  const SAVED_POSTS_SYNC_ALARM = 'tidyfeed_saved_posts_sync';

  // Function to sync saved post IDs from API
  async function syncSavedPostIds(): Promise<number> {
    try {
      console.log('[TidyFeed] Syncing saved post IDs from API...');
      const response = await fetch(`${BACKEND_URL}/api/posts/ids`, {
        method: 'GET',
        credentials: 'include', // Send HttpOnly auth cookie
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[TidyFeed] Not authenticated, skipping saved posts sync');
          return 0;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.ids && Array.isArray(data.ids)) {
        await browser.storage.local.set({
          saved_x_ids: data.ids,
          saved_posts_last_synced: Date.now()
        });
        console.log(`[TidyFeed] Saved post IDs synced: ${data.ids.length} posts`);
        return data.ids.length;
      }
      return 0;
    } catch (error) {
      console.error('[TidyFeed] Error syncing saved post IDs:', error);
      return 0;
    }
  }

  // Handle TOGGLE_SAVE message
  async function handleToggleSave(
    action: 'save' | 'unsave',
    postData: { x_id: string; content?: string; author?: any; media?: any; url?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (action === 'save') {
        // POST to save the post
        const response = await fetch(`${BACKEND_URL}/api/posts`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x_id: postData.x_id,
            content: postData.content || null,
            author: postData.author || null,
            media: postData.media || null,
            url: postData.url || null,
            platform: 'x'
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          return { success: false, error: err.error || 'Failed to save post' };
        }

        return { success: true };
      } else {
        // DELETE to unsave the post
        const response = await fetch(`${BACKEND_URL}/api/posts/x/${postData.x_id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const err = await response.json();
          return { success: false, error: err.error || 'Failed to unsave post' };
        }

        return { success: true };
      }
    } catch (error) {
      console.error('[TidyFeed] Toggle save error:', error);
      return { success: false, error: String(error) };
    }
  }

  // Handle LINK_SOCIAL_IDENTITY message
  async function handleLinkSocialIdentity(identity: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[TidyFeed] Linking social identity:', identity);

      // Try to get auth token manually to support localhost/HTTP where SameSite=None fails
      let token: string | undefined;
      try {
        // Check both backend URL and localhost just in case
        const cookie = await browser.cookies.get({ url: BACKEND_URL, name: 'auth_token' });
        if (cookie) token = cookie.value;
        else {
          // Fallback for localhost dev
          const localCookie = await browser.cookies.get({ url: 'http://localhost:3000', name: 'auth_token' });
          if (localCookie) token = localCookie.value;
        }
      } catch (e) {
        console.warn('[TidyFeed] Failed to read auth cookies:', e);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/link-social`, {
        method: 'POST',
        headers,
        credentials: 'include', // Keep this for standard flows
        body: JSON.stringify(identity)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Not logged in to TidyFeed' };
        }
        const err = await response.json();
        return { success: false, error: err.error || 'Failed to link identity' };
      }

      return { success: true };
    } catch (error) {
      console.error('[TidyFeed] Link identity error:', error);
      return { success: false, error: String(error) };
    }
  }

  // Handle SYNC_PLATFORM_IDENTITY - extracts identity using Main World script and links it
  async function handleSyncPlatformIdentity(
    platform: string,
    tabId?: number
  ): Promise<{ success: boolean; username?: string; skipped?: boolean; reason?: string; error?: string }> {
    if (!tabId) {
      return { success: false, error: 'No tab ID provided' };
    }

    if (platform !== 'x') {
      return { success: false, skipped: true, reason: `Platform ${platform} not yet supported` };
    }

    try {
      // Execute script in Main World to extract __INITIAL_STATE__
      const results = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: extractXIdentityInPage,
      });

      const identity = results?.[0]?.result;

      if (!identity) {
        return { success: false, skipped: true, reason: 'No identity found (not logged in to X?)' };
      }

      console.log('[TidyFeed] Extracted identity:', identity.platform_username);

      // Now link it via API
      const linkResult = await handleLinkSocialIdentity(identity);

      if (linkResult.success) {
        return { success: true, username: identity.platform_username };
      } else {
        return linkResult;
      }
    } catch (error) {
      console.error('[TidyFeed] Sync platform identity error:', error);
      return { success: false, error: String(error) };
    }
  }

  // This function runs in the MAIN world to access window.__INITIAL_STATE__
  function extractXIdentityInPage(): any | null {
    try {
      const w = window as any;

      // Debug: Log what globals are available
      console.log('[TidyFeed] Checking for identity data...');
      console.log('[TidyFeed] __INITIAL_STATE__ exists:', !!w.__INITIAL_STATE__);

      // Method 1: Try __INITIAL_STATE__ with various structures
      if (w.__INITIAL_STATE__) {
        const state = w.__INITIAL_STATE__;

        // Log structure for debugging
        console.log('[TidyFeed] State keys:', Object.keys(state));

        // Path 1: state.session + state.entities.users.entities
        if (state.session?.user_id && state.entities?.users?.entities) {
          const user = state.entities.users.entities[state.session.user_id];
          if (user) {
            console.log('[TidyFeed] Found user via Path 1');
            return formatUser(user);
          }
        }

        // Path 2: state.viewer (some X versions use this)
        if (state.viewer) {
          console.log('[TidyFeed] Found user via Path 2 (viewer)');
          return formatUser(state.viewer);
        }

        // Path 3: state.user or state.currentUser
        if (state.user) {
          console.log('[TidyFeed] Found user via Path 3 (user)');
          return formatUser(state.user);
        }
        if (state.currentUser) {
          console.log('[TidyFeed] Found user via Path 3 (currentUser)');
          return formatUser(state.currentUser);
        }

        // Path 4: Deep search for any user-like object
        if (state.entities?.users) {
          const users = state.entities.users;
          // Try entities directly
          if (users.entities) {
            const userIds = Object.keys(users.entities);
            console.log('[TidyFeed] Found', userIds.length, 'users in entities');
            // If there's a session, use that user
            if (state.session?.user_id && users.entities[state.session.user_id]) {
              return formatUser(users.entities[state.session.user_id]);
            }
          }
        }
      }

      // Method 2: Try __NEXT_DATA__ (some SSR apps use this)
      if (w.__NEXT_DATA__?.props?.pageProps?.user) {
        console.log('[TidyFeed] Found user via __NEXT_DATA__');
        return formatUser(w.__NEXT_DATA__.props.pageProps.user);
      }

      // Method 3: Look for logged in user via DOM meta tags or cookies
      // (X sometimes has screen_name in cookies)
      const screenNameCookie = document.cookie.split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('twid='));
      if (screenNameCookie) {
        // twid cookie contains user ID like "u%3D123456"
        const match = screenNameCookie.match(/u%3D(\d+)/);
        if (match) {
          console.log('[TidyFeed] Found user ID via twid cookie:', match[1]);
          // We have the ID but not the full profile - return partial
          return {
            platform: 'x',
            platform_user_id: match[1],
            platform_username: null, // Will be null, but ID is enough for backend
            display_name: null,
            avatar_url: null
          };
        }
      }

      console.log('[TidyFeed] No identity found via any method');
      return null;

    } catch (e) {
      console.error('[TidyFeed] extractXIdentityInPage error:', e);
      return null;
    }

    function formatUser(user: any) {
      return {
        platform: 'x',
        platform_user_id: user.id_str || user.id || user.rest_id || String(user.userId),
        platform_username: user.screen_name || user.screenName || user.username,
        display_name: user.name || user.displayName,
        avatar_url: (user.profile_image_url_https || user.profileImageUrl || user.avatar_url)?.replace('_normal', '_bigger')
      };
    }
  }

  // Handle report block request to backend
  async function handleReportBlock(
    blockedId: string,
    blockedName: string,
    reason: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const storage = await browser.storage.local.get(['tidyfeed_uid', 'user_type']);
      const tidyfeed_uid = (storage.tidyfeed_uid as string) || 'unknown';
      const user_type = (storage.user_type as string) || 'guest';

      const response = await fetch(`${BACKEND_URL}/api/report`, {
        method: 'POST',
        credentials: 'include', // Send HttpOnly auth cookie
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': tidyfeed_uid,
          'X-User-Type': user_type,
        },
        body: JSON.stringify({
          blocked_x_id: blockedId,
          blocked_x_name: blockedName,
          reason: reason || 'manual_block'
        }),
      });

      const data = await response.json();
      console.log('[TidyFeed] Report sent:', data);
      return { success: response.ok, data };
    } catch (error) {
      console.error('[TidyFeed] Report error:', error);
      return { success: false, error: String(error) };
    }
  }

  // X Web Client Bearer Token (public, used by X web app)
  const X_BEARER_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

  /**
   * Perform native X/Twitter block using internal API
   * Uses user's login session via cookies
   */
  async function performBlockOnX(targetUserId: string): Promise<{
    success: boolean;
    userId?: string | null;       // Numeric user ID from response
    screenName?: string;          // Screen name from response
    error?: string;
    errorCode?: 'CSRF_MISSING' | 'AUTH_FAILED' | 'RATE_LIMITED' | 'NETWORK_ERROR';
  }> {
    try {
      // Add random delay (500ms - 2000ms) for anti-detection
      const delay = Math.floor(Math.random() * 1500) + 500;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Step A: Get CSRF token from cookies
      const csrfCookie = await browser.cookies.get({
        url: 'https://x.com',
        name: 'ct0'
      });

      if (!csrfCookie?.value) {
        console.error('[TidyFeed] CSRF token (ct0) not found - user may not be logged in');
        return {
          success: false,
          error: '请确保已在浏览器登录 X',
          errorCode: 'CSRF_MISSING'
        };
      }

      const csrfToken = csrfCookie.value;
      console.log('[TidyFeed] Got CSRF token:', csrfToken.substring(0, 10) + '...');

      // Step B: Construct and send block request
      // Use screen_name since we extract handles from DOM (not numeric user IDs)
      const response = await fetch('https://x.com/i/api/1.1/blocks/create.json', {
        method: 'POST',
        headers: {
          'authorization': X_BEARER_TOKEN,
          'x-csrf-token': csrfToken,
          'content-type': 'application/x-www-form-urlencoded',
          'x-twitter-active-user': 'yes',
          'x-twitter-client-language': 'en',
        },
        body: `screen_name=${encodeURIComponent(targetUserId)}`,
        credentials: 'include', // Include cookies
      });

      // Step C: Handle response
      if (response.ok) {
        const data = await response.json();
        console.log('[TidyFeed] ✅ X Block successful:', data?.screen_name, 'ID:', data?.id_str);
        return {
          success: true,
          userId: data?.id_str || null,       // Numeric user ID
          screenName: data?.screen_name || targetUserId
        };
      }

      // Error handling
      if (response.status === 401 || response.status === 403) {
        console.error('[TidyFeed] Auth failed:', response.status);
        return {
          success: false,
          error: '请确保已在浏览器登录 X',
          errorCode: 'AUTH_FAILED'
        };
      }

      if (response.status === 429) {
        console.error('[TidyFeed] Rate limited');
        return {
          success: false,
          error: '操作太快，请稍后再试',
          errorCode: 'RATE_LIMITED'
        };
      }

      // Other errors
      const errorText = await response.text();
      console.error('[TidyFeed] Block API error:', response.status, errorText);
      return {
        success: false,
        error: `Block failed: ${response.status}`
      };

    } catch (error) {
      console.error('[TidyFeed] Network error during block:', error);
      return {
        success: false,
        error: String(error),
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  // Initial Sync & Alarm Setup + User Identification
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log('[TidyFeed] Extension installed/updated:', details.reason);

    // User identification - generate UUID if not exists
    const { tidyfeed_uid } = await browser.storage.local.get('tidyfeed_uid');
    if (!tidyfeed_uid) {
      const uid = crypto.randomUUID();
      await browser.storage.local.set({
        tidyfeed_uid: uid,
        user_type: 'guest'
      });
      console.log('[TidyFeed] Generated new user ID:', uid);
    }

    await syncRegexRules();
    await syncSavedPostIds();

    // Create alarm for daily sync (regex)
    browser.alarms.create(REGEX_SYNC_ALARM, {
      periodInMinutes: 60 * 24 // 24 hours
    });

    // Create alarm for saved posts sync (every 30 mins)
    browser.alarms.create(SAVED_POSTS_SYNC_ALARM, {
      periodInMinutes: 30
    });
  });

  // Alarm Listener
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REGEX_SYNC_ALARM) {
      syncRegexRules();
    }
    if (alarm.name === SAVED_POSTS_SYNC_ALARM) {
      syncSavedPostIds();
    }
  });

  // Run sync on startup as well
  syncRegexRules();
  syncSavedPostIds();


  console.log('[TidyFeed] Background script loaded', { id: browser.runtime.id });

  // Handle messages from content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FORCE_REGEX_SYNC') {
      console.log('[TidyFeed] Manual sync requested');
      syncRegexRules().then((count) => {
        sendResponse({ success: true, count });
      });
      return true; // Async response
    }

    if (message.type === 'EXTRACT_VIDEO_URL') {
      handleVideoExtraction(message.tweetId, sender.tab?.id)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error('[TidyFeed] Video extraction error:', error);
          sendResponse({ videoUrl: null, fullText: null, error: error.message });
        });

      return true; // Async response
    }

    if (message.type === 'FETCH_TWEET_DATA') {
      fetchTweetDataFromApi(message.tweetId)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error('[TidyFeed] Tweet data fetch error:', error);
          sendResponse({ text: null, error: error.message });
        });

      return true;
    }

    if (message.type === 'REPORT_BLOCK') {
      handleReportBlock(message.blockedId, message.blockedName, message.reason)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error('[TidyFeed] Report block error:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.type === 'BLOCK_USER') {
      // Block user via X's internal API
      performBlockOnX(message.userId)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error('[TidyFeed] Block user error:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.type === 'TOGGLE_SAVE') {
      handleToggleSave(message.action, message.postData)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error('[TidyFeed] Toggle save error:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.type === 'LINK_SOCIAL_IDENTITY') {
      handleLinkSocialIdentity(message.identity)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.type === 'SYNC_PLATFORM_IDENTITY') {
      handleSyncPlatformIdentity(message.platform, sender.tab?.id)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });
});

interface VideoExtractionResult {
  videoUrl: string | null;
  fullText: string | null;
  quotedTweet?: {
    tweetId: string;
    handle: string;
    text: string;
    videoUrl?: string | null;
  } | null;
}

interface TweetDataResult {
  text: string | null;
  authorName: string | null;
  handle: string | null;
}

/**
 * Extract video URL and full text - try multiple methods
 */
async function handleVideoExtraction(tweetId: string, tabId?: number): Promise<VideoExtractionResult> {
  console.log('[TidyFeed] Extracting video for tweet:', tweetId);

  // Try Syndication API first
  const syndicationResult = await fetchFromSyndicationApiExtended(tweetId);
  if (syndicationResult.videoUrl) {
    console.log('[TidyFeed] Got video from Syndication API');
    return syndicationResult;
  }

  // Try main world injection as fallback for video only
  if (tabId) {
    const injectedUrl = await tryMainWorldInjection(tweetId, tabId);
    if (injectedUrl) {
      console.log('[TidyFeed] Got video from main world injection');
      return {
        videoUrl: injectedUrl,
        fullText: syndicationResult.fullText,
        quotedTweet: syndicationResult.quotedTweet
      };
    }
  }

  console.log('[TidyFeed] No video URL found');
  return {
    videoUrl: null,
    fullText: syndicationResult.fullText,
    quotedTweet: syndicationResult.quotedTweet
  };
}

/**
 * Fetch tweet data (text, author) from Syndication API
 */
async function fetchTweetDataFromApi(tweetId: string): Promise<TweetDataResult> {
  try {
    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return { text: null, authorName: null, handle: null };
    }

    const data = await response.json();
    return {
      text: data.text || null,
      authorName: data.user?.name || null,
      handle: data.user?.screen_name ? `@${data.user.screen_name}` : null,
    };
  } catch (error) {
    console.error('[TidyFeed] fetchTweetDataFromApi error:', error);
    return { text: null, authorName: null, handle: null };
  }
}

/**
 * Extended Syndication API fetch that returns both video URL and text
 */
async function fetchFromSyndicationApiExtended(tweetId: string): Promise<VideoExtractionResult> {
  try {
    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return { videoUrl: null, fullText: null, quotedTweet: null };
    }

    const data = await response.json();
    console.log('[TidyFeed] Syndication API response:', data);

    const videoUrl = extractVideoFromSyndicationData(data);
    const fullText = data.text || null;

    // Extract quoted tweet info if available
    let quotedTweet = null;
    if (data.quoted_tweet) {
      const quotedVideoUrl = extractVideoFromSyndicationData(data.quoted_tweet);
      quotedTweet = {
        tweetId: data.quoted_tweet.id_str,
        handle: data.quoted_tweet.user?.screen_name ? `@${data.quoted_tweet.user.screen_name}` : '@quote',
        text: data.quoted_tweet.text || '',
        videoUrl: quotedVideoUrl
      };
    }

    return { videoUrl, fullText, quotedTweet };
  } catch (error) {
    console.error('[TidyFeed] Syndication API error:', error);
    return { videoUrl: null, fullText: null, quotedTweet: null };
  }
}

/**
 * Fetch video URL from Twitter Syndication API
 * This is a public API that returns tweet data as JSON
 */
async function fetchFromSyndicationApi(tweetId: string): Promise<string | null> {
  try {
    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[TidyFeed] Syndication API response not ok:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[TidyFeed] Syndication API response:', data);

    // Extract video URL from the response
    return extractVideoFromSyndicationData(data);
  } catch (error) {
    console.error('[TidyFeed] Syndication API error:', error);
    return null;
  }
}

/**
 * Extract the best video URL from Syndication API response
 */
function extractVideoFromSyndicationData(data: any): string | null {
  try {
    // Check for video in mediaDetails
    if (data.mediaDetails && Array.isArray(data.mediaDetails)) {
      for (const media of data.mediaDetails) {
        if (media.type === 'video' && media.video_info?.variants) {
          const url = getBestMp4Url(media.video_info.variants);
          if (url) return url;
        }
      }
    }

    // Check for video in extended_entities
    if (data.extended_entities?.media) {
      for (const media of data.extended_entities.media) {
        if (media.video_info?.variants) {
          const url = getBestMp4Url(media.video_info.variants);
          if (url) return url;
        }
      }
    }

    // Check for video in legacy format
    if (data.legacy?.extended_entities?.media) {
      for (const media of data.legacy.extended_entities.media) {
        if (media.video_info?.variants) {
          const url = getBestMp4Url(media.video_info.variants);
          if (url) return url;
        }
      }
    }

    // Check quoted tweet
    if (data.quoted_tweet) {
      const quotedVideo = extractVideoFromSyndicationData(data.quoted_tweet);
      if (quotedVideo) return quotedVideo;
    }

  } catch (error) {
    console.error('[TidyFeed] Error parsing syndication data:', error);
  }

  return null;
}

/**
 * Get the best quality MP4 URL from variants
 */
function getBestMp4Url(variants: any[]): string | null {
  if (!Array.isArray(variants)) return null;

  const mp4Variants = variants
    .filter((v: any) => v.content_type === 'video/mp4' || (v.url && v.url.includes('.mp4')))
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

  if (mp4Variants.length > 0) {
    console.log('[TidyFeed] Found MP4 variants:', mp4Variants.length, 'Best bitrate:', mp4Variants[0].bitrate);
    return mp4Variants[0].url;
  }

  return null;
}

/**
 * Try extracting video URL via main world injection
 */
async function tryMainWorldInjection(tweetId: string, tabId: number): Promise<string | null> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: extractVideoFromReactPropsInPage,
      args: [tweetId],
    });

    if (results && results[0]?.result) {
      return results[0].result;
    }

    return null;
  } catch (error) {
    console.error('[TidyFeed] Script execution error:', error);
    return null;
  }
}

/**
 * This function runs in the MAIN world to access React internals
 */
function extractVideoFromReactPropsInPage(tweetId: string): string | null {
  try {
    console.log('[TidyFeed] Searching React props for video in tweet:', tweetId);

    // Find the tweet article
    let article: HTMLElement | null = null;
    const statusLinks = document.querySelectorAll(`a[href*="/status/${tweetId}"]`);
    for (const link of statusLinks) {
      const closest = link.closest('article');
      if (closest) {
        article = closest as HTMLElement;
        break;
      }
    }

    if (!article) return null;

    // Find video element
    const videoEl = article.querySelector('video');
    if (!videoEl) return null;

    // Walk up looking for React data
    let currentEl: HTMLElement | null = videoEl as HTMLElement;
    let videoUrl: string | null = null;

    while (currentEl && !videoUrl) {
      const keys = Object.keys(currentEl);

      for (const key of keys) {
        if (key.startsWith('__reactFiber') || key.startsWith('__reactProps')) {
          try {
            const reactData = (currentEl as any)[key];
            videoUrl = deepSearchForVideo(reactData, 0);
            if (videoUrl) break;
          } catch (e) {
            // Continue
          }
        }
      }

      currentEl = currentEl.parentElement;
    }

    return videoUrl;
  } catch (error) {
    console.error('[TidyFeed] Error in React extraction:', error);
    return null;
  }
}

function deepSearchForVideo(obj: any, depth: number): string | null {
  if (!obj || depth > 20) return null;

  try {
    if (obj.video_info?.variants) {
      return getBestMp4UrlLocal(obj.video_info.variants);
    }

    if (obj.extended_entities?.media) {
      for (const media of obj.extended_entities.media) {
        if (media.video_info?.variants) {
          return getBestMp4UrlLocal(media.video_info.variants);
        }
      }
    }

    if (obj.memoizedProps) {
      const url = deepSearchForVideo(obj.memoizedProps, depth + 1);
      if (url) return url;
    }

    if (obj.child && depth < 15) {
      const url = deepSearchForVideo(obj.child, depth + 1);
      if (url) return url;
    }

  } catch (e) { }

  return null;
}

function getBestMp4UrlLocal(variants: any[]): string | null {
  if (!Array.isArray(variants)) return null;

  const mp4Variants = variants
    .filter((v: any) => v.content_type === 'video/mp4')
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

  return mp4Variants.length > 0 ? mp4Variants[0].url : null;
}
