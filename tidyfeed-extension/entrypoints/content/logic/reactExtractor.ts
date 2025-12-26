/**
 * React Props Extractor for Twitter/X
 * Uses main world injection to extract video URLs from React internals
 */

/**
 * Extract video URL from React props by executing in the main world
 * This is the function that gets injected into the page context
 */
function extractVideoFromReactProps(tweetId: string): string | null {
    try {
        // Find the tweet article by looking for links containing the tweet ID
        let article: HTMLElement | null = null;

        // Method 1: Find by status link
        const statusLinks = document.querySelectorAll(`a[href*="/status/${tweetId}"]`);
        for (const link of statusLinks) {
            const closest = link.closest('article');
            if (closest) {
                article = closest as HTMLElement;
                break;
            }
        }

        // Method 2: If that doesn't work, find by aria-labelledby
        if (!article) {
            article = document.querySelector(`article[aria-labelledby*="${tweetId}"]`);
        }

        if (!article) {
            console.log('[TidyFeed] Could not find article for tweet:', tweetId);
            return null;
        }

        // Find the video element
        const videoEl = article.querySelector('video');
        if (!videoEl) {
            console.log('[TidyFeed] No video element found in tweet');
            return null;
        }

        // Look for React fiber/props on the video or its ancestors
        let currentEl: HTMLElement | null = videoEl;
        let videoUrl: string | null = null;

        // Walk up the DOM tree looking for React internals
        while (currentEl && !videoUrl) {
            // Look for __reactFiber or __reactProps keys
            const keys = Object.keys(currentEl);
            const fiberKey = keys.find(k => k.startsWith('__reactFiber'));
            const propsKey = keys.find(k => k.startsWith('__reactProps'));

            if (fiberKey) {
                const fiber = (currentEl as any)[fiberKey];
                videoUrl = extractFromFiber(fiber);
            }

            if (!videoUrl && propsKey) {
                const props = (currentEl as any)[propsKey];
                videoUrl = extractFromProps(props);
            }

            currentEl = currentEl.parentElement;
        }

        return videoUrl;
    } catch (error) {
        console.error('[TidyFeed] Error extracting video URL:', error);
        return null;
    }
}

function extractFromFiber(fiber: any, depth = 0): string | null {
    if (!fiber || depth > 20) return null;

    try {
        // Check memoizedProps
        if (fiber.memoizedProps) {
            const url = findVideoInObject(fiber.memoizedProps);
            if (url) return url;
        }

        // Check child fibers
        if (fiber.child) {
            const url = extractFromFiber(fiber.child, depth + 1);
            if (url) return url;
        }

        // Check sibling fibers
        if (fiber.sibling) {
            const url = extractFromFiber(fiber.sibling, depth + 1);
            if (url) return url;
        }

        // Check return (parent)
        if (fiber.return && depth < 5) {
            const url = extractFromFiber(fiber.return, depth + 1);
            if (url) return url;
        }
    } catch (e) {
        // Ignore errors, continue searching
    }

    return null;
}

function extractFromProps(props: any, depth = 0): string | null {
    if (!props || depth > 15) return null;
    return findVideoInObject(props, depth);
}

function findVideoInObject(obj: any, depth = 0): string | null {
    if (!obj || depth > 15) return null;

    try {
        // Look for video_info.variants
        if (obj.video_info?.variants) {
            return getBestVideoUrl(obj.video_info.variants);
        }

        // Look for extended_entities.media
        if (obj.extended_entities?.media) {
            for (const media of obj.extended_entities.media) {
                if (media.video_info?.variants) {
                    return getBestVideoUrl(media.video_info.variants);
                }
            }
        }

        // Look for legacy.extended_entities
        if (obj.legacy?.extended_entities?.media) {
            for (const media of obj.legacy.extended_entities.media) {
                if (media.video_info?.variants) {
                    return getBestVideoUrl(media.video_info.variants);
                }
            }
        }

        // Look for media array directly
        if (Array.isArray(obj.media)) {
            for (const media of obj.media) {
                if (media.video_info?.variants) {
                    return getBestVideoUrl(media.video_info.variants);
                }
            }
        }

        // Recursively search object properties
        if (typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
                if (key.startsWith('_') || key === 'window' || key === 'document') continue;

                try {
                    const value = obj[key];
                    if (value && typeof value === 'object') {
                        const url = findVideoInObject(value, depth + 1);
                        if (url) return url;
                    }
                } catch (e) {
                    // Skip properties that throw errors
                }
            }
        }
    } catch (e) {
        // Ignore errors
    }

    return null;
}

function getBestVideoUrl(variants: any[]): string | null {
    if (!Array.isArray(variants)) return null;

    // Filter to MP4 only and sort by bitrate (highest first)
    const mp4Variants = variants
        .filter((v: any) => v.content_type === 'video/mp4' || v.url?.includes('.mp4'))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    if (mp4Variants.length > 0) {
        return mp4Variants[0].url;
    }

    return null;
}

/**
 * Get the video URL for a tweet by injecting into the main world
 */
export async function getVideoUrlFromReact(tweetId: string): Promise<string | null> {
    try {
        // Get the current tab
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) {
            console.error('[TidyFeed] No active tab found');
            return null;
        }

        // Execute the extraction function in the main world
        const results = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: extractVideoFromReactProps,
            args: [tweetId],
        });

        if (results && results[0]?.result) {
            console.log('[TidyFeed] Extracted video URL:', results[0].result);
            return results[0].result;
        }

        return null;
    } catch (error) {
        console.error('[TidyFeed] Error executing script in main world:', error);
        return null;
    }
}

/**
 * Alternative: Send message to background script to execute injection
 */
export async function requestVideoUrlExtraction(tweetId: string): Promise<string | null> {
    try {
        const response = await browser.runtime.sendMessage({
            type: 'EXTRACT_VIDEO_URL',
            tweetId,
        });

        return response?.videoUrl || null;
    } catch (error) {
        console.error('[TidyFeed] Error requesting video URL extraction:', error);
        return null;
    }
}
