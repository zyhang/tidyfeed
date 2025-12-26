/**
 * Background script for TidyFeed
 * Handles video URL extraction via Syndication API and main world injection
 */

export default defineBackground(() => {
  console.log('[TidyFeed] Background script loaded', { id: browser.runtime.id });

  // Handle messages from content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
