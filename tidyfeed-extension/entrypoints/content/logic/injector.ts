/**
 * Tweet Button Injector for Twitter/X
 * Injects a download button into tweet action bars and downloads tweet data as ZIP
 * with professional archival-grade filenames
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// SVG icons
const DOWNLOAD_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5H7l5-6 5 6h-4v5h-2z" transform="rotate(180 12 12)"/>
</svg>`;

const SPINNER_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="animate-spin">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/>
  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

const BUTTON_STYLES = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  cursor: pointer;
  color: rgb(113, 118, 123);
  background: transparent;
  border: none;
  transition: background-color 0.2s, color 0.2s;
`;

const BUTTON_HOVER_STYLES = `
  background-color: rgba(29, 155, 240, 0.1);
  color: rgb(29, 155, 240);
`;

const BUTTON_LOADING_STYLES = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  cursor: wait;
  color: rgb(29, 155, 240);
  background: rgba(29, 155, 240, 0.1);
  border: none;
`;

interface MediaItem {
    url: string;
    type: 'img' | 'video';
}

interface TweetData {
    authorName: string;
    handle: string;
    timestamp: string;
    text: string;
    mediaItems: MediaItem[];
    tweetUrl: string;
    tweetId: string;
    hasVideo: boolean;
    // Quote tweet data
    quoteTweet?: {
        handle: string;
        tweetId: string;
        text: string;
        mediaItems: MediaItem[];
        hasVideo: boolean;
    };
}

/**
 * Sanitize handle for filename - remove illegal characters
 */
function sanitizeHandle(handle: string): string {
    return handle
        .replace('@', '')
        .replace(/[^\w\d_-]/g, '') // Remove emojis, special chars
        .slice(0, 30); // Limit length
}

/**
 * Extract tweet ID from URL
 */
function extractTweetId(url: string): string | null {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Generate professional filename
 * Format: {handle}_{tweetId}_{type}_{index}.{ext}
 */
function generateFilename(handle: string, tweetId: string, type: 'img' | 'video', index: number, ext: string): string {
    const safeHandle = sanitizeHandle(handle);
    const paddedIndex = String(index).padStart(2, '0');
    return `${safeHandle}_${tweetId}_${type}_${paddedIndex}.${ext}`;
}

// Interface for video extraction response
interface VideoExtractionResponse {
    videoUrl: string | null;
    fullText: string | null;
    quotedTweet?: {
        tweetId: string;
        handle: string;
        text: string;
        videoUrl?: string | null;
    } | null;
}

/**
 * Request video URL and full text from background script
 */
async function requestVideoUrlAndText(tweetId: string): Promise<VideoExtractionResponse> {
    try {
        const response = await browser.runtime.sendMessage({
            type: 'EXTRACT_VIDEO_URL',
            tweetId,
        });
        return {
            videoUrl: response?.videoUrl || null,
            fullText: response?.fullText || null,
            quotedTweet: response?.quotedTweet || null,
        };
    } catch (error) {
        console.warn('[TidyFeed] Error requesting video URL:', error);
        return { videoUrl: null, fullText: null, quotedTweet: null };
    }
}

/**
 * Request just video URL (backward compatibility)
 */
async function requestVideoUrl(tweetId: string): Promise<string | null> {
    const result = await requestVideoUrlAndText(tweetId);
    return result.videoUrl;
}

/**
 * Extract media items from a container element
 */
function extractMediaFromContainer(container: Element): MediaItem[] {
    const items: MediaItem[] = [];

    // Images
    const images = container.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img');
    images.forEach((img) => {
        const src = img.getAttribute('src');
        if (src && !src.includes('profile_images') && !src.includes('emoji') && !src.includes('twemoji')) {
            const highQualitySrc = src.replace(/\&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
            items.push({ url: highQualitySrc, type: 'img' });
        }
    });

    // Video posters (as fallback images)
    const videos = container.querySelectorAll('video');
    videos.forEach((video) => {
        const poster = video.getAttribute('poster');
        if (poster) {
            items.push({ url: poster, type: 'img' });
        }
    });

    return items;
}

/**
 * Extract data from a tweet article element
 */
function extractTweetData(article: HTMLElement): TweetData {
    // Find quote tweet container using multiple strategies
    const findQuoteContainer = (): Element | null => {
        // Strategy 1: Try the standard test-id (legacy)
        const byTestId = article.querySelector('[data-testid="quoteTweet"]');
        if (byTestId) return byTestId;

        // Strategy 2: Find a div[role="link"] that contains a User-Name
        // Quote tweets are interactive card links with their own author info
        const nestedLinks = article.querySelectorAll('div[role="link"][tabindex="0"]');
        for (const link of nestedLinks) {
            if (link.querySelector('[data-testid="User-Name"]')) {
                return link;
            }
        }

        return null;
    };

    const quoteContainer = findQuoteContainer();

    // Helper function to check if an element is inside the quote container
    const isInsideQuote = (el: Element): boolean => {
        if (!quoteContainer) return false;
        return quoteContainer.contains(el);
    };

    console.log('[TidyFeed] Quote container search result:', quoteContainer ? 'FOUND' : 'NOT FOUND');

    // Author name - get the first User-Name element that's not inside a quote
    let authorNameEl: Element | null = null;
    let handleLink: Element | null = null;

    const allUserNames = article.querySelectorAll('[data-testid="User-Name"]');
    for (const userName of allUserNames) {
        if (isInsideQuote(userName)) {
            continue; // Skip quote tweet's user name
        }
        const nameSpan = userName.querySelector('a span span');
        if (nameSpan) {
            authorNameEl = nameSpan;
            handleLink = userName.querySelector('a[href^="/"]');
            break;
        }
    }

    const authorName = authorNameEl?.textContent?.trim() || 'Unknown';
    const handle = handleLink?.getAttribute('href')?.replace('/', '@') || '@unknown';

    // Timestamp - get the first time element not in quote
    let timestamp = '';
    const allTimeEls = article.querySelectorAll('time');
    for (const timeEl of allTimeEls) {
        if (isInsideQuote(timeEl)) {
            continue;
        }
        timestamp = timeEl.getAttribute('datetime') || '';
        break;
    }

    // Tweet text - get the first tweetText not in quote
    let text = '';
    const allTweetTexts = article.querySelectorAll('[data-testid="tweetText"]');
    for (const textEl of allTweetTexts) {
        if (isInsideQuote(textEl)) {
            continue;
        }
        text = textEl.textContent?.trim() || '';
        break;
    }

    // Tweet URL and ID - get from the main tweet link (with timestamp)
    let tweetUrl = window.location.href;
    let tweetId = '';

    const allStatusLinks = article.querySelectorAll('a[href*="/status/"]');
    for (const link of allStatusLinks) {
        if (isInsideQuote(link)) {
            continue;
        }
        const href = link.getAttribute('href');
        if (href) {
            tweetUrl = `https://x.com${href}`;
            tweetId = extractTweetId(href) || '';
            break;
        }
    }

    if (!tweetId) {
        tweetId = Date.now().toString();
    }

    // Check for video (not in quote)
    let hasVideo = false;
    const allVideos = article.querySelectorAll('video');
    for (const video of allVideos) {
        if (isInsideQuote(video)) {
            continue;
        }
        hasVideo = true;
        break;
    }

    // Extract main tweet media (excluding quote container)
    const mediaItems: MediaItem[] = [];

    // Images not in quote
    const allImages = article.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img');
    allImages.forEach((img) => {
        if (isInsideQuote(img)) {
            return; // Skip quote media
        }
        const src = img.getAttribute('src');
        if (src && !src.includes('profile_images') && !src.includes('emoji') && !src.includes('twemoji')) {
            const highQualitySrc = src.replace(/\&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
            mediaItems.push({ url: highQualitySrc, type: 'img' });
        }
    });

    // Video posters not in quote
    allVideos.forEach((video) => {
        if (isInsideQuote(video)) {
            return;
        }
        const poster = video.getAttribute('poster');
        if (poster) {
            mediaItems.push({ url: poster, type: 'img' });
        }
    });

    // Extract quote tweet data if exists
    let quoteTweet: TweetData['quoteTweet'] = undefined;

    if (quoteContainer) {
        console.log('[TidyFeed] Quote container found:', quoteContainer);

        // Try to get href from React props (the container is role="link" but uses React href prop)
        let containerHref = '';
        try {
            const reactPropsKey = Object.keys(quoteContainer).find(
                (key) => key.startsWith('__reactProps') || key.startsWith('__reactInternalInstance')
            );
            if (reactPropsKey) {
                const props = (quoteContainer as any)[reactPropsKey];
                if (props?.href) {
                    containerHref = props.href;
                    console.log('[TidyFeed] Got href from React props:', containerHref);
                }
            }
        } catch (e) {
            console.warn('[TidyFeed] Could not extract React props href');
        }

        // Quote handle - extract from React props href or fallback to anchor
        let quoteHandle = '@quote';
        let quoteTweetId = `${tweetId}_quote`;

        if (containerHref) {
            // Parse /username/status/123456 from containerHref
            const hrefMatch = containerHref.match(/^\/([^\/]+)(?:\/status\/(\d+))?/);
            if (hrefMatch) {
                quoteHandle = `@${hrefMatch[1]}`;
                if (hrefMatch[2]) {
                    quoteTweetId = hrefMatch[2];
                }
            }
        } else {
            // Fallback to anchor search
            const quoteHandleEl = quoteContainer.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                quoteContainer.querySelector('a[href^="/"]');
            if (quoteHandleEl) {
                const href = quoteHandleEl.getAttribute('href') || '';
                const match = href.match(/^\/([^\/]+)/);
                if (match && match[1]) {
                    quoteHandle = `@${match[1]}`;
                }
            }

            // Fallback for tweet ID
            const quoteLinkEl = quoteContainer.querySelector('a[href*="/status/"]');
            if (quoteLinkEl) {
                const linkHref = quoteLinkEl.getAttribute('href')!;
                quoteTweetId = extractTweetId(linkHref) || quoteTweetId;
            }
        }

        // Quote text
        const quoteTextEl = quoteContainer.querySelector('[data-testid="tweetText"]');
        const quoteText = quoteTextEl?.textContent?.trim() || '';

        // Quote media
        const quoteMediaItems = extractMediaFromContainer(quoteContainer);

        // Quote has video?
        const quoteHasVideo = quoteContainer.querySelector('video') !== null;

        console.log('[TidyFeed] Quote tweet data:', { quoteHandle, quoteTweetId, quoteText, mediaCount: quoteMediaItems.length, hasVideo: quoteHasVideo });

        if (quoteMediaItems.length > 0 || quoteText || quoteHasVideo) {
            quoteTweet = {
                handle: quoteHandle,
                tweetId: quoteTweetId,
                text: quoteText,
                mediaItems: quoteMediaItems,
                hasVideo: quoteHasVideo,
            };
        }
    }

    return {
        authorName,
        handle,
        timestamp,
        text,
        mediaItems,
        tweetUrl,
        tweetId,
        hasVideo,
        quoteTweet,
    };
}

/**
 * Get file extension from URL
 */
function getExtensionFromUrl(url: string): string {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    if (match) return match[1];
    if (url.includes('.mp4') || url.includes('video')) return 'mp4';
    return 'jpg';
}

/**
 * Download media as blob
 */
async function downloadMedia(url: string): Promise<{ blob: Blob; url: string } | null> {
    try {
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
        });

        if (!response.ok) {
            console.warn(`[TidyFeed] Failed to fetch ${url}: ${response.status}`);
            return null;
        }

        const blob = await response.blob();
        return { blob, url };
    } catch (error) {
        console.warn(`[TidyFeed] CORS or network error fetching ${url}:`, error);
        return null;
    }
}

/**
 * Format timestamp for filename
 */
function formatTimestampForFilename(isoTimestamp: string): string {
    if (!isoTimestamp) return 'unknown';
    const date = new Date(isoTimestamp);
    return date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

/**
 * Generate markdown content for the tweet
 */
function generateMarkdownContent(data: TweetData): string {
    const formattedDate = data.timestamp
        ? new Date(data.timestamp).toLocaleString()
        : 'Unknown date';

    let content = `# Tweet by ${data.handle}

**Author:** ${data.handle} (${data.authorName})
**Date:** ${formattedDate}
**Tweet ID:** ${data.tweetId}

---

${data.text}
`;

    if (data.quoteTweet) {
        // Detect if text is likely truncated (Note Tweets are ~280 chars)
        const isTruncated = data.quoteTweet.text.length >= 270 ||
            data.quoteTweet.text.endsWith('…') ||
            data.quoteTweet.text.includes('t.co/');

        content += `
---

## Quoted Tweet by ${data.quoteTweet.handle}

**Quote ID:** ${data.quoteTweet.tweetId}

${data.quoteTweet.text}
`;

        if (isTruncated) {
            // Extract quote tweet URL from the ID
            const handle = data.quoteTweet.handle.replace('@', '');
            content += `
> ⚠️ **Note:** This may be a long-form "Note Tweet" with truncated text.  
> [View full tweet on X](https://x.com/${handle}/status/${data.quoteTweet.tweetId})
`;
        }
    }

    content += `
---

**Source:** ${data.tweetUrl}

*Downloaded with TidyFeed*
`;

    return content;
}

/**
 * Handle button click - download as ZIP
 */
async function handleDownloadClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLButtonElement;
    const article = button.closest('article');

    if (!article) {
        console.error('[TidyFeed] Could not find tweet article');
        return;
    }

    // Set loading state
    button.disabled = true;
    button.innerHTML = SPINNER_ICON;
    button.style.cssText = BUTTON_LOADING_STYLES;

    try {
        const data = extractTweetData(article as HTMLElement);
        console.log('[TidyFeed] Extracting tweet data:', data);

        // Create ZIP
        const zip = new JSZip();

        // Add content.md at root
        const markdownContent = generateMarkdownContent(data);
        zip.file('content.md', markdownContent);

        // Create main folder for main tweet media
        const mainFolder = zip.folder('main');
        let mainMediaCount = 0;

        // If tweet has video, try to extract the real URL
        if (data.hasVideo && data.tweetId) {
            console.log('[TidyFeed] Tweet has video, extracting URL for ID:', data.tweetId);
            const videoUrl = await requestVideoUrl(data.tweetId);

            if (videoUrl) {
                console.log('[TidyFeed] Got video URL:', videoUrl);
                const result = await downloadMedia(videoUrl);
                if (result) {
                    mainMediaCount++;
                    const filename = generateFilename(data.handle, data.tweetId, 'video', mainMediaCount, 'mp4');
                    mainFolder?.file(filename, result.blob);
                    console.log(`[TidyFeed] Added: main/${filename}`);
                }
            } else {
                console.warn('[TidyFeed] Could not extract video URL, will use thumbnail');
            }
        }

        // Download main tweet images
        for (const item of data.mediaItems) {
            const result = await downloadMedia(item.url);
            if (result) {
                mainMediaCount++;
                const ext = getExtensionFromUrl(result.url);
                const filename = generateFilename(data.handle, data.tweetId, item.type, mainMediaCount, ext);
                mainFolder?.file(filename, result.blob);
                console.log(`[TidyFeed] Added: main/${filename}`);
            }
        }

        // Handle quote tweet media
        if (data.quoteTweet && (data.quoteTweet.mediaItems.length > 0 || data.quoteTweet.hasVideo)) {
            const quoteFolder = zip.folder('quote');
            let quoteMediaCount = 0;

            // If quote tweet has video, try to extract it and get full text
            if (data.quoteTweet.hasVideo && data.quoteTweet.tweetId) {
                console.log('[TidyFeed] Quote tweet has video, extracting URL for ID:', data.quoteTweet.tweetId);

                // FALLBACK: If we have a "fake" quote ID (ending in _quote) and it's not a real ID, 
                // try requesting the Main Tweet's API. The main tweet API response often contains the quoted tweet data.
                let targetIdForApi = data.quoteTweet.tweetId;
                if (targetIdForApi.endsWith('_quote')) {
                    console.log(`[TidyFeed] Fallback: Using Main Tweet ID for Quote Video request: ${data.tweetId}`);
                    targetIdForApi = data.tweetId;
                }

                const quoteResult = await requestVideoUrlAndText(targetIdForApi);

                // Update quote text with full text from API if available
                if (quoteResult.fullText) {
                    console.log('[TidyFeed] Got full quote text from API:', quoteResult.fullText.substring(0, 100) + '...');
                    data.quoteTweet.text = quoteResult.fullText;
                }

                // If we got real quoted tweet data (ID, handle) back from the API (via main tweet lookup), update our local data!
                if (quoteResult.quotedTweet) {
                    console.log('[TidyFeed] Updated Quote Data from API:', quoteResult.quotedTweet);
                    data.quoteTweet.tweetId = quoteResult.quotedTweet.tweetId;
                    data.quoteTweet.handle = quoteResult.quotedTweet.handle;
                    data.quoteTweet.text = quoteResult.quotedTweet.text || data.quoteTweet.text; // Use API text if available

                    // If the API returned a video URL specifically for the quoted tweet, use it
                    if (quoteResult.quotedTweet.videoUrl) {
                        quoteResult.videoUrl = quoteResult.quotedTweet.videoUrl;
                    }
                }

                if (quoteResult.videoUrl) {
                    console.log('[TidyFeed] Got quote video URL:', quoteResult.videoUrl);
                    const result = await downloadMedia(quoteResult.videoUrl);
                    if (result) {
                        quoteMediaCount++;
                        const filename = generateFilename(data.quoteTweet.handle, data.quoteTweet.tweetId, 'video', quoteMediaCount, 'mp4');
                        quoteFolder?.file(filename, result.blob);
                        console.log(`[TidyFeed] Added: quote/${filename}`);
                    }
                } else {
                    console.warn('[TidyFeed] Could not extract quote video URL');
                }
            }

            // Download quote tweet images
            for (const item of data.quoteTweet.mediaItems) {
                const result = await downloadMedia(item.url);
                if (result) {
                    quoteMediaCount++;
                    const ext = getExtensionFromUrl(result.url);
                    const filename = generateFilename(
                        data.quoteTweet.handle,
                        data.quoteTweet.tweetId,
                        item.type,
                        quoteMediaCount,
                        ext
                    );
                    quoteFolder?.file(filename, result.blob);
                    console.log(`[TidyFeed] Added: quote/${filename}`);
                }
            }
        }

        // Generate and save ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Create ZIP filename
        const handle = sanitizeHandle(data.handle);
        const timestamp = formatTimestampForFilename(data.timestamp);
        const zipFilename = `tidyfeed-${handle}-${timestamp}.zip`;

        saveAs(zipBlob, zipFilename);
        console.log(`[TidyFeed] ✅ Downloaded: ${zipFilename}`);

        // Success feedback
        button.style.color = 'rgb(0, 186, 124)';
        button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>`;

        setTimeout(() => {
            button.innerHTML = DOWNLOAD_ICON;
            button.style.cssText = BUTTON_STYLES;
            button.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('[TidyFeed] Error creating ZIP:', error);

        // Error feedback
        button.style.color = 'rgb(244, 67, 54)';
        button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>`;

        setTimeout(() => {
            button.innerHTML = DOWNLOAD_ICON;
            button.style.cssText = BUTTON_STYLES;
            button.disabled = false;
        }, 2000);
    }
}

/**
 * Create the download button element
 */
function createDownloadButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'tidyfeed-download-btn';
    button.setAttribute('data-tidyfeed-btn', 'true');
    button.setAttribute('aria-label', 'Download tweet as ZIP');
    button.setAttribute('title', 'TidyFeed: Download tweet');
    button.innerHTML = DOWNLOAD_ICON;
    button.style.cssText = BUTTON_STYLES;

    button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
            button.style.cssText = BUTTON_STYLES + BUTTON_HOVER_STYLES;
        }
    });
    button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
            button.style.cssText = BUTTON_STYLES;
        }
    });

    button.addEventListener('click', handleDownloadClick);

    return button;
}

/**
 * Inject button into a tweet's action bar
 */
function injectButtonIntoTweet(article: HTMLElement): boolean {
    if (article.dataset.tidyfeedInjected === 'true') {
        return false;
    }

    const actionBar = article.querySelector('div[role="group"]');
    if (!actionBar) {
        return false;
    }

    if (actionBar.querySelector('[data-tidyfeed-btn]')) {
        return false;
    }

    const button = createDownloadButton();
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center;';
    wrapper.appendChild(button);

    actionBar.appendChild(wrapper);
    article.dataset.tidyfeedInjected = 'true';

    return true;
}

/**
 * Process all tweets on the page
 */
function processAllTweetsForInjection(): void {
    const articles = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]');
    articles.forEach((article) => {
        injectButtonIntoTweet(article);
    });
}

/**
 * Initialize the Tweet Button Injector
 */
export function initTweetInjector(): void {
    console.log('[TidyFeed] 🔧 Tweet Injector initialized');

    processAllTweetsForInjection();

    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
        }

        if (shouldProcess) {
            requestAnimationFrame(() => {
                processAllTweetsForInjection();
            });
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log('[TidyFeed] Tweet Injector MutationObserver active');
}
