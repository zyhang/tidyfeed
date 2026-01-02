/**
 * Image Caching Service
 * 
 * Downloads images from external URLs and uploads them to R2 storage.
 * Returns a mapping of original URLs to cached R2 URLs.
 */

import type { TikHubMedia } from './tikhub';

export interface CachedMediaResult {
    originalUrl: string;
    cachedUrl: string;
    r2Key: string;
    fileSize: number;
}

/**
 * Cache media items to R2 storage
 * Returns a Map of original URL -> cached API URL, and total size in bytes
 */
export async function cacheMediaToR2(
    mediaBucket: R2Bucket,
    tweetId: string,
    media: TikHubMedia[],
    avatarUrls: string[] = []
): Promise<{ urlMap: Map<string, string>; totalSize: number }> {
    const urlMap = new Map<string, string>();
    let totalSize = 0;

    // Collect all URLs to cache
    const urlsToCache: { url: string; type: 'media' | 'avatar' }[] = [];

    // Add media URLs (images only, not videos)
    for (const m of media) {
        if (m.type === 'photo' && m.url) {
            urlsToCache.push({ url: m.url, type: 'media' });
        }
        // Cache video poster/preview images
        if ((m.type === 'video' || m.type === 'animated_gif') && m.preview_url) {
            urlsToCache.push({ url: m.preview_url, type: 'media' });
        }
    }

    // Add avatar URLs
    for (const avatarUrl of avatarUrls) {
        if (avatarUrl) {
            urlsToCache.push({ url: avatarUrl, type: 'avatar' });
        }
    }

    // Process each URL
    const cachePromises = urlsToCache.map(async ({ url, type }) => {
        try {
            const result = await cacheImageToR2(mediaBucket, tweetId, url, type);
            if (result) {
                urlMap.set(result.originalUrl, result.cachedUrl);
                totalSize += result.fileSize || 0;
            }
        } catch (error) {
            console.error(`[ImageCache] Failed to cache ${url}:`, error);
        }
    });

    await Promise.all(cachePromises);

    console.log(`[ImageCache] Cached ${urlMap.size} images for tweet ${tweetId}, total size: ${totalSize} bytes`);
    return { urlMap, totalSize };
}

/**
 * Cache a single image to R2
 */
async function cacheImageToR2(
    mediaBucket: R2Bucket,
    tweetId: string,
    imageUrl: string,
    type: 'media' | 'avatar'
): Promise<CachedMediaResult | null> {
    try {
        // Generate a unique filename based on URL hash
        const urlHash = await hashString(imageUrl);
        const extension = getImageExtension(imageUrl);
        const filename = `${urlHash}${extension}`;
        const r2Key = `images/${tweetId}/${type}/${filename}`;

        // Check if already cached
        const existing = await mediaBucket.head(r2Key);
        if (existing) {
            return {
                originalUrl: imageUrl,
                cachedUrl: `https://api.tidyfeed.app/api/images/${tweetId}/${type}/${filename}`,
                r2Key,
                fileSize: existing.size,
            };
        }

        // Download the image
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'TidyFeed/1.0 (Image Cache)',
            },
        });

        if (!response.ok) {
            console.error(`[ImageCache] Failed to fetch ${imageUrl}: ${response.status}`);
            return null;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const imageData = await response.arrayBuffer();
        const fileSize = imageData.byteLength;

        // Upload to R2
        await mediaBucket.put(r2Key, imageData, {
            httpMetadata: {
                contentType,
                cacheControl: 'public, max-age=31536000, immutable', // 1 year cache
            },
        });

        return {
            originalUrl: imageUrl,
            cachedUrl: `https://api.tidyfeed.app/api/images/${tweetId}/${type}/${filename}`,
            r2Key,
            fileSize,
        };
    } catch (error) {
        console.error(`[ImageCache] Error caching ${imageUrl}:`, error);
        return null;
    }
}

/**
 * Generate a short hash of a string
 */
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Take first 12 characters for brevity
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

/**
 * Get image extension from URL
 */
function getImageExtension(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Handle Twitter's format parameter
        const format = urlObj.searchParams.get('format');
        if (format) {
            return `.${format}`;
        }

        // Extract from pathname
        const match = pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (match) {
            return `.${match[1].toLowerCase()}`;
        }

        // Default to jpg for Twitter images
        return '.jpg';
    } catch {
        return '.jpg';
    }
}

/**
 * Replace URLs in tweet data with cached URLs
 */
export function replaceMediaUrls(
    tweet: any,
    urlMap: Map<string, string>
): any {
    if (!tweet) return tweet;

    const replaced = { ...tweet };

    // Replace author avatar
    if (replaced.author?.profile_image_url) {
        const cachedUrl = findCachedUrl(replaced.author.profile_image_url, urlMap);
        if (cachedUrl) {
            replaced.author = { ...replaced.author, profile_image_url: cachedUrl };
        }
    }

    // Replace media URLs
    if (replaced.media) {
        replaced.media = replaced.media.map((m: any) => {
            const newMedia = { ...m };

            if (m.url) {
                const cachedUrl = findCachedUrl(m.url, urlMap);
                if (cachedUrl) {
                    newMedia.url = cachedUrl;
                }
            }

            if (m.preview_url) {
                const cachedUrl = findCachedUrl(m.preview_url, urlMap);
                if (cachedUrl) {
                    newMedia.preview_url = cachedUrl;
                }
            }

            return newMedia;
        });
    }

    // Replace quoted tweet URLs recursively
    if (replaced.quoted_tweet) {
        replaced.quoted_tweet = replaceMediaUrls(replaced.quoted_tweet, urlMap);
    }

    return replaced;
}

/**
 * Find cached URL, handling Twitter's image URL variations
 * (e.g., _normal, _bigger suffixes for avatars)
 */
function findCachedUrl(originalUrl: string, urlMap: Map<string, string>): string | null {
    // Direct match
    if (urlMap.has(originalUrl)) {
        return urlMap.get(originalUrl)!;
    }

    // Try without size suffix for avatars
    const withoutSuffix = originalUrl.replace(/_(normal|bigger|mini|200x200|400x400)/, '');
    if (urlMap.has(withoutSuffix)) {
        return urlMap.get(withoutSuffix)!;
    }

    // Try with different suffixes
    for (const suffix of ['_bigger', '_normal', '']) {
        const withSuffix = originalUrl.replace(/_(normal|bigger|mini|200x200|400x400)/, suffix);
        if (urlMap.has(withSuffix)) {
            return urlMap.get(withSuffix)!;
        }
    }

    return null;
}
