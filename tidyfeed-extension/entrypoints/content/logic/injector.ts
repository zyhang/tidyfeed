/**
 * Tweet Button Injector for Twitter/X
 * Injects a refined "Bookmark to TidyFeed" button into tweet action bars.
 * Focuses on a premium, distraction-free "Read Later" experience.
 */

import { getTweetFullText } from './networkInterceptor';

// SVG icons
type Locale = 'zh' | 'ja' | 'es' | 'en';

const LOCALE_STRINGS: Record<string, Record<Locale, string>> = {
    bookmark: {
        en: 'Bookmark to TidyFeed',
        zh: '收藏到 TidyFeed',
        ja: 'TidyFeedに保存',
        es: 'Guardar en TidyFeed'
    },
    saved: {
        en: 'Saved to TidyFeed',
        zh: '已收藏到 TidyFeed',
        ja: 'TidyFeedに保存しました',
        es: 'Guardado en TidyFeed'
    }
};

function getLocaleString(key: string): string {
    const lang = navigator.language.slice(0, 2).toLowerCase();
    let locale: Locale = 'en';
    if (lang === 'zh') locale = 'zh';
    else if (lang === 'ja') locale = 'ja';
    else if (lang === 'es') locale = 'es';

    return LOCALE_STRINGS[key]?.[locale] || LOCALE_STRINGS[key]?.['en'] || key;
}

// Button Styles
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
  transition: background-color 0.2s, color 0.2s, transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 0;
`;

const BOOKMARK_BUTTON_HOVER_STYLES = `
  background-color: rgba(0, 186, 124, 0.1);
  color: rgb(0, 186, 124);
`;

const BOOKMARK_BUTTON_ACTIVE_STYLES = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  cursor: pointer;
  color: rgb(0, 186, 124); /* TidyFeed Emerald */
  background: transparent;
  border: none;
  transition: background-color 0.2s, color 0.2s, transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
`;

// New Premium Icons (Sleeker Look)
const BOOKMARK_ICON_OUTLINE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
</svg>`;

const BOOKMARK_ICON_FILLED = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none">
  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
</svg>`;

interface MediaItem {
    url: string;
    type: 'img' | 'video';
}

interface TweetData {
    authorName: string;
    authorAvatar: string | null;
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
 * Extract tweet ID from URL
 */
function extractTweetId(url: string): string | null {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Show a toast notification
 */
function showToast(message: string): void {
    // Remove existing toast if any
    const existingToast = document.getElementById('tidyfeed-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'tidyfeed-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '24px',
        fontSize: '14px',
        fontWeight: '500',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: '10000',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: '0',
    });

    document.body.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Auto remove after 2.5s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
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
        const byTestId = article.querySelector('[data-testid="quoteTweet"]');
        if (byTestId) return byTestId;

        const nestedLinks = article.querySelectorAll('div[role="link"][tabindex="0"]');
        for (const link of nestedLinks) {
            if (link.querySelector('[data-testid="User-Name"]')) {
                return link;
            }
        }
        return null;
    };

    const quoteContainer = findQuoteContainer();
    const isInsideQuote = (el: Element): boolean => {
        if (!quoteContainer) return false;
        return quoteContainer.contains(el);
    };

    // Author info
    let authorNameEl: Element | null = null;
    let handleLink: Element | null = null;
    const allUserNames = article.querySelectorAll('[data-testid="User-Name"]');
    for (const userName of allUserNames) {
        if (isInsideQuote(userName)) continue;
        const nameSpan = userName.querySelector('a span span');
        if (nameSpan) {
            authorNameEl = nameSpan;
            handleLink = userName.querySelector('a[href^="/"]');
            break;
        }
    }
    const authorName = authorNameEl?.textContent?.trim() || 'Unknown';
    const handle = handleLink?.getAttribute('href')?.replace('/', '@') || '@unknown';

    // Author avatar
    let authorAvatar: string | null = null;
    const allAvatars = article.querySelectorAll('img[src*="profile_images"]');
    for (const avatar of allAvatars) {
        if (isInsideQuote(avatar)) continue;
        const src = avatar.getAttribute('src');
        if (src) {
            authorAvatar = src.replace('_normal', '_bigger');
            break;
        }
    }

    // Timestamp
    let timestamp = '';
    const allTimeEls = article.querySelectorAll('time');
    for (const timeEl of allTimeEls) {
        if (isInsideQuote(timeEl)) continue;
        timestamp = timeEl.getAttribute('datetime') || '';
        break;
    }

    // Text (with cache lookup)
    let text = '';
    let tempTweetId = '';
    const tempStatusLinks = article.querySelectorAll('a[href*="/status/"]');
    for (const link of tempStatusLinks) {
        if (isInsideQuote(link)) continue;
        const href = link.getAttribute('href');
        if (href) {
            tempTweetId = extractTweetId(href) || '';
            break;
        }
    }
    if (tempTweetId) {
        const cachedFullText = getTweetFullText(tempTweetId);
        if (cachedFullText) text = cachedFullText;
    }
    if (!text) {
        const allTweetTexts = article.querySelectorAll('[data-testid="tweetText"]');
        for (const textEl of allTweetTexts) {
            if (isInsideQuote(textEl)) continue;
            text = textEl.textContent?.trim() || '';
            break;
        }
    }
    text = text.replace(/https:\/\/t\.co\/\w+\s*$/, '').trim();

    // URL & ID
    let tweetUrl = window.location.href;
    let tweetId = '';
    const allStatusLinks = article.querySelectorAll('a[href*="/status/"]');
    for (const link of allStatusLinks) {
        if (isInsideQuote(link)) continue;
        const href = link.getAttribute('href');
        if (href) {
            tweetUrl = `https://x.com${href}`;
            tweetId = extractTweetId(href) || '';
            break;
        }
    }
    if (!tweetId) tweetId = Date.now().toString();

    // Video check
    let hasVideo = false;
    const allVideos = article.querySelectorAll('video');
    for (const video of allVideos) {
        if (isInsideQuote(video)) continue;
        hasVideo = true;
        break;
    }

    // Media
    const mediaItems: MediaItem[] = [];
    const allImages = article.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img');
    allImages.forEach((img) => {
        if (isInsideQuote(img)) return;
        const src = img.getAttribute('src');
        if (src && !src.includes('profile_images') && !src.includes('emoji') && !src.includes('twemoji')) {
            const highQualitySrc = src.replace(/\&name=\w+/, '&name=large').replace(/\?.*$/, '?format=jpg&name=large');
            mediaItems.push({ url: highQualitySrc, type: 'img' });
        }
    });

    // Populate Quote Tweet
    let quoteTweet: TweetData['quoteTweet'] = undefined;
    if (quoteContainer) {
        let quoteHandle = '@quote';
        let quoteTweetId = `${tweetId}_quote`;

        const quoteHandleEl = quoteContainer.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
            quoteContainer.querySelector('a[href^="/"]');
        if (quoteHandleEl) {
            const href = quoteHandleEl.getAttribute('href') || '';
            const match = href.match(/^\/([^\/]+)/);
            if (match && match[1]) quoteHandle = `@${match[1]}`;
        }
        const quoteLinkEl = quoteContainer.querySelector('a[href*="/status/"]');
        if (quoteLinkEl) {
            const linkHref = quoteLinkEl.getAttribute('href')!;
            quoteTweetId = extractTweetId(linkHref) || quoteTweetId;
        }

        const quoteTextEl = quoteContainer.querySelector('[data-testid="tweetText"]');
        const quoteText = quoteTextEl?.textContent?.trim() || '';
        const quoteMediaItems = extractMediaFromContainer(quoteContainer);
        const quoteHasVideo = quoteContainer.querySelector('video') !== null;

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
        authorAvatar,
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
 * Handle bookmark button click - optimistic UI
 */
async function handleBookmarkClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLButtonElement;
    const article = button.closest('article');

    if (!article) return;

    // Add pop/scale animation
    button.style.transform = 'scale(0.85)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);

    const data = extractTweetData(article as HTMLElement);
    const xId = data.tweetId;

    if (!xId) {
        console.error('[TidyFeed] Could not extract tweet ID');
        return;
    }

    // Check if text appears truncated - fetch full text from API
    const isTextTruncated = data.text.endsWith('…') ||
        data.text.endsWith('...') ||
        (data.text.length >= 270 && !data.text.endsWith('.') && !data.text.endsWith('!') && !data.text.endsWith('?'));

    if (isTextTruncated && xId) {
        try {
            const apiResult = await browser.runtime.sendMessage({
                type: 'FETCH_TWEET_DATA',
                tweetId: xId,
            });
            if (apiResult?.text && apiResult.text.length > data.text.length) {
                data.text = apiResult.text;
            }
        } catch (err) {
            console.warn('[TidyFeed] Bookmark: Failed to fetch full text:', err);
        }
    }

    // Check current saved state
    const storage = await browser.storage.local.get('saved_x_ids');
    const savedIds: string[] = (storage.saved_x_ids as string[]) || [];
    const isCurrentlySaved = savedIds.includes(xId);

    // OPTIMISTIC UI: Toggle the icon immediately
    const newSavedState = !isCurrentlySaved;
    button.innerHTML = newSavedState ? BOOKMARK_ICON_FILLED : BOOKMARK_ICON_OUTLINE;
    button.style.cssText = newSavedState ? BOOKMARK_BUTTON_ACTIVE_STYLES : BUTTON_STYLES;
    button.setAttribute('aria-label', newSavedState ? getLocaleString('saved') : getLocaleString('bookmark'));
    button.setAttribute('title', newSavedState ? getLocaleString('saved') : getLocaleString('bookmark'));

    if (newSavedState) {
        showToast(getLocaleString('saved'));
    }

    // Update storage immediately (optimistic)
    if (newSavedState) {
        savedIds.push(xId);
    } else {
        const idx = savedIds.indexOf(xId);
        if (idx > -1) savedIds.splice(idx, 1);
    }
    await browser.storage.local.set({ saved_x_ids: savedIds });

    // Send message to background for API call
    try {
        const result = await browser.runtime.sendMessage({
            type: 'TOGGLE_SAVE',
            action: newSavedState ? 'save' : 'unsave',
            postData: {
                x_id: xId,
                content: data.text || null,
                author: {
                    name: data.authorName,
                    handle: data.handle,
                    avatar: data.authorAvatar
                },
                media: data.mediaItems.map(m => m.url),
                url: data.tweetUrl
            }
        });

        if (!result.success) {
            throw new Error(result.error);
        } else {
            // Auto-download video if enabled
            if (newSavedState && data.hasVideo) {
                const settings = await browser.storage.local.get('settings_auto_download_video');
                if (settings.settings_auto_download_video === true) {
                    browser.runtime.sendMessage({
                        type: 'QUEUE_DOWNLOAD',
                        tweetUrl: data.tweetUrl,
                        savedPostId: result.postId
                    }).catch(e => console.warn('[TidyFeed] Auto-download error:', e));
                }
            }
        }
    } catch (error) {
        console.error('[TidyFeed] Toggle save error:', error);
        // Rollback on error
        button.innerHTML = isCurrentlySaved ? BOOKMARK_ICON_FILLED : BOOKMARK_ICON_OUTLINE;
        button.style.cssText = isCurrentlySaved ? BOOKMARK_BUTTON_ACTIVE_STYLES : BUTTON_STYLES;
        showToast('Sync failed');

        // Rollback storage
        const storageRollback = await browser.storage.local.get('saved_x_ids');
        const rollbackIds: string[] = (storageRollback.saved_x_ids as string[]) || [];
        if (newSavedState) {
            const idx = rollbackIds.indexOf(xId);
            if (idx > -1) rollbackIds.splice(idx, 1);
        } else {
            if (!rollbackIds.includes(xId)) rollbackIds.push(xId);
        }
        await browser.storage.local.set({ saved_x_ids: rollbackIds });
    }
}

/**
 * Create the bookmark button element
 */
async function createBookmarkButton(tweetId: string): Promise<HTMLButtonElement> {
    const button = document.createElement('button');
    button.className = 'tidyfeed-bookmark-btn';
    button.setAttribute('data-tidyfeed-btn', 'true');
    button.setAttribute('data-tweet-id', tweetId);

    // Check initial saved state
    const storage = await browser.storage.local.get('saved_x_ids');
    const savedIds: string[] = (storage.saved_x_ids as string[]) || [];
    const isSaved = savedIds.includes(tweetId);

    button.setAttribute('aria-label', isSaved ? getLocaleString('saved') : getLocaleString('bookmark'));
    button.setAttribute('title', isSaved ? getLocaleString('saved') : getLocaleString('bookmark'));

    button.innerHTML = isSaved ? BOOKMARK_ICON_FILLED : BOOKMARK_ICON_OUTLINE;
    button.style.cssText = isSaved ? BOOKMARK_BUTTON_ACTIVE_STYLES : BUTTON_STYLES;

    // Hover effects
    button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
            const currentStyle = button.innerHTML === BOOKMARK_ICON_FILLED ? BOOKMARK_BUTTON_ACTIVE_STYLES : BUTTON_STYLES;
            button.style.cssText = currentStyle + BOOKMARK_BUTTON_HOVER_STYLES;
        }
    });

    button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
            button.style.cssText = button.innerHTML === BOOKMARK_ICON_FILLED ? BOOKMARK_BUTTON_ACTIVE_STYLES : BUTTON_STYLES;
        }
    });

    button.addEventListener('click', handleBookmarkClick);

    return button;
}

/**
 * Inject specific button into a tweet's action bar
 */
async function injectButtonIntoTweet(article: HTMLElement): Promise<boolean> {
    if (article.dataset.tidyfeedInjected === 'true') {
        return false;
    }
    article.dataset.tidyfeedInjected = 'true';

    // Find the action bar
    let actionBar: Element | null = null;
    const allGroups = article.querySelectorAll('div[role="group"]');

    // Strategy 1: Find group containing typical action buttons
    for (const group of allGroups) {
        const hasActionButtons = group.querySelector(
            '[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], ' +
            '[data-testid="bookmark"], [data-testid="views"]'
        );
        if (hasActionButtons) {
            actionBar = group;
            break;
        }
    }

    // Strategy 2: Fallback to aria-label
    if (!actionBar) {
        for (const group of allGroups) {
            const ariaLabel = group.getAttribute('aria-label') || '';
            if (ariaLabel.match(/回复|喜欢|转帖|书签|观看|replies?|likes?|retweets?|bookmarks?|views?/i)) {
                actionBar = group;
                break;
            }
        }
    }

    // Strategy 3: Last resort fallback
    if (!actionBar && allGroups.length > 0) {
        actionBar = allGroups[allGroups.length - 1];
    }

    if (!actionBar) return false;
    if (actionBar.querySelector('[data-tidyfeed-btn]')) return false;

    // Extract tweet ID
    const data = extractTweetData(article);
    const tweetId = data.tweetId;

    if (tweetId) {
        const bookmarkBtn = await createBookmarkButton(tweetId);
        // Insert as the last child of the action bar, 
        // effectively replacing the default bookmark button if we choose to hide it via CSS later,
        // or getting a spot at the end.
        actionBar.appendChild(bookmarkBtn);
        return true;
    }

    return false;
}

/**
 * Check if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
    try {
        return !!browser.runtime?.id;
    } catch {
        return false;
    }
}

/**
 * Process all tweets on the page
 */
function processAllTweetsForInjection(): void {
    if (!isExtensionContextValid()) return;

    const articles = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]');
    articles.forEach((article) => {
        injectButtonIntoTweet(article).catch(() => {
            // Silently ignore
        });
    });
}

/**
 * Initialize the Tweet Injector
 */
export function initTweetInjector(): void {
    processAllTweetsForInjection();

    const observer = new MutationObserver((mutations) => {
        if (!isExtensionContextValid()) {
            observer.disconnect();
            return;
        }

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
}
