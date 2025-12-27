/**
 * Ad Blocker Logic for Twitter/X
 * Uses MutationObserver to detect and hide promoted tweets
 */

// Ad indicator texts (localized)
const AD_INDICATORS = ['Ad', 'Promoted', '广告', 'プロモーション', '광고', 'Gesponsert', 'Sponsorisé', 'Promocionado'];

// Module-level variables
let blockedKeywords: string[] = [];
let cachedRegexPatterns: RegExp[] = [];
let enableRegexFilter = false;

// Load settings from storage
function loadSettings(): void {
    chrome.storage.local.get(['user_blocked_keywords', 'cloud_regex_list', 'enable_regex_filter']).then((result) => {
        // Keywords
        if (result.user_blocked_keywords) {
            blockedKeywords = result.user_blocked_keywords;
        }

        // Regex Settings
        enableRegexFilter = result.enable_regex_filter || false;
        if (result.cloud_regex_list) {
            updateRegexCache(result.cloud_regex_list);
        }

        console.log(`[TidyFeed] Settings loaded. Keywords: ${blockedKeywords.length}, Regex enabled: ${enableRegexFilter}, Rules: ${cachedRegexPatterns.length}`);
        processAllTweets();
    });
}

// Compile regex patterns safely
function updateRegexCache(patterns: string[]): void {
    cachedRegexPatterns = [];
    for (const pattern of patterns) {
        try {
            cachedRegexPatterns.push(new RegExp(pattern, 'i'));
        } catch (e) {
            console.warn('[TidyFeed] Invalid regex pattern:', pattern, e);
        }
    }
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    let shouldReprocess = false;

    if (changes.user_blocked_keywords) {
        blockedKeywords = changes.user_blocked_keywords.newValue || [];
        shouldReprocess = true;
    }

    if (changes.enable_regex_filter) {
        enableRegexFilter = changes.enable_regex_filter.newValue;
        shouldReprocess = true;
    }

    if (changes.cloud_regex_list) {
        updateRegexCache(changes.cloud_regex_list.newValue || []);
        shouldReprocess = true;
    }

    if (shouldReprocess) {
        console.log('[TidyFeed] Settings updated, reprocessing tweets...');
        // Reset processed flags for visible tweets to allow re-checking
        const containers = document.querySelectorAll<HTMLElement>('[data-testid="cellInnerDiv"]');
        containers.forEach(container => {
            if (container.dataset.tidyfeedRevealed !== 'true' && !container.querySelector('.tidyfeed-fold-bar')) {
                delete container.dataset.tidyfeedProcessed;
            }
        });
        processAllTweets();
    }
});

// Check if an element contains ad indicators
function isAdTweet(element: Element): boolean {
    // Method 1: Look for the "Ad" disclosure link at bottom of tweet
    // Twitter uses a specific structure: a small link that says "Ad" or "Promoted"
    const socialContextLinks = element.querySelectorAll('a[href*="/ads"], a[href*="business.x.com"]');
    if (socialContextLinks.length > 0) {
        console.log('[TidyFeed] Detected ad via business link');
        return true;
    }

    // Method 2: Check for data-testid="placementTracking" - this is a tracking pixel for ads
    const placementTracking = element.querySelector('[data-testid="placementTracking"]');
    if (placementTracking) {
        console.log('[TidyFeed] Detected ad via placementTracking');
        return true;
    }

    // Method 3: Look for specific ad/promoted text in small spans
    const allSpans = element.querySelectorAll('span');
    for (const span of allSpans) {
        const text = span.textContent?.trim();

        // Check for exact ad indicator match
        if (text && AD_INDICATORS.includes(text)) {
            // Make sure this is in the "promoted by" context, not just random text
            // Usually the ad indicator is a small standalone span
            const style = window.getComputedStyle(span);
            const fontSize = parseFloat(style.fontSize);

            // Ad indicators are usually small text (13px or less)
            if (fontSize <= 15) {
                console.log('[TidyFeed] Detected ad via text indicator:', text);
                return true;
            }
        }
    }

    // Method 4: Check for "Promoted" in aria-label
    const elementsWithAria = element.querySelectorAll('[aria-label*="Promoted"], [aria-label*="Ad"]');
    if (elementsWithAria.length > 0) {
        console.log('[TidyFeed] Detected ad via aria-label');
        return true;
    }

    return false;
}

// Check if tweet contains blocked keywords
function isKeywordTweet(element: Element): string | null {
    if (blockedKeywords.length === 0) return null;

    const tweetTextEl = element.querySelector('[data-testid="tweetText"]');
    if (!tweetTextEl) return null;

    const text = tweetTextEl.textContent || '';
    if (!text) return null;

    const lowerText = text.toLowerCase();
    for (const keyword of blockedKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return keyword;
        }
    }

    return null;
}

// Check if tweet matches any cached regex pattern
function isRegexTweet(element: Element): string | null {
    if (!enableRegexFilter || cachedRegexPatterns.length === 0) return null;

    const tweetTextEl = element.querySelector('[data-testid="tweetText"]');
    if (!tweetTextEl) return null;

    const text = tweetTextEl.textContent || '';
    if (!text) return null;

    for (const regex of cachedRegexPatterns) {
        if (regex.test(text)) {
            return 'AI Smart Filter';
        }
    }

    return null;
}

// Process a single tweet container
function processTweetContainer(container: HTMLElement): boolean {
    if (container.dataset.tidyfeedProcessed === 'true') {
        // If manually revealed, don't re-process
        if (container.dataset.tidyfeedRevealed === 'true') {
            return false;
        }
        return false;
    }

    // Check for Ads
    if (isAdTweet(container)) {
        container.dataset.tidyfeedProcessed = 'true';
        collapseTweet(container, 'Ad');
        console.log('[TidyFeed] 🚫 Soft blocked ad tweet');
        return true;
    }

    // Check for Keywords
    const matchedKeyword = isKeywordTweet(container);
    if (matchedKeyword) {
        container.dataset.tidyfeedProcessed = 'true';
        collapseTweet(container, `Keyword: ${matchedKeyword}`);
        console.log(`[TidyFeed] 🚫 Soft blocked keyword tweet: ${matchedKeyword}`);
        return true;
    }

    // Check for Regex Patterns (AI Smart Filter)
    const matchedRegexReason = isRegexTweet(container);
    if (matchedRegexReason) {
        container.dataset.tidyfeedProcessed = 'true';
        collapseTweet(container, matchedRegexReason);
        console.log(`[TidyFeed] 🚫 Soft blocked by AI Filter`);
        return true;
    }

    // Mark as processed even if not blocked, to avoid re-checking every time
    // Unless we want to support dynamic keyword updates (which we do), 
    // so we might want to ONLY mark as processed if blocked? 
    // Actually, for performance, we should mark as processed. 
    // When keywords change, we manually clear the processed flag.
    container.dataset.tidyfeedProcessed = 'true';

    return false;
}

// Detect current theme context
function getThemeContext(): { isDark: boolean; bgColor: string; borderColor: string; textColor: string; hoverColor: string } {
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    // Simple heuristic: check if background is dark (rgb values low)
    const rgb = bodyBg.match(/\d+/g);
    let isDark = false;

    if (rgb && rgb.length >= 3) {
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        isDark = brightness < 128; // Standard dark mode threshold
    }

    if (isDark) {
        return {
            isDark: true,
            bgColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textColor: '#71767B', // Twitter Dark Gray
            hoverColor: 'rgba(255, 255, 255, 0.1)'
        };
    } else {
        return {
            isDark: false,
            bgColor: 'rgba(0, 0, 0, 0.03)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            textColor: '#536471', // Twitter Light Gray
            hoverColor: 'rgba(0, 0, 0, 0.06)'
        };
    }
}

/**
 * Collapse a tweet into a clickable bar instead of removing it entirely
 */
function collapseTweet(container: HTMLElement, reason: string): void {
    // Find the actual tweet content (usually an article element)
    const tweetContent = container.querySelector('article');
    if (!tweetContent) {
        // Fallback if structure changes
        container.style.display = 'none';
        return;
    }

    // Hide the content initially
    const contentEl = tweetContent as HTMLElement;
    contentEl.style.display = 'none';
    contentEl.style.opacity = '0';
    contentEl.style.transition = 'opacity 0.3s ease';

    // Get theme colors
    const theme = getThemeContext();

    // Create the fold bar
    const foldBar = document.createElement('div');
    foldBar.className = 'tidyfeed-fold-bar';
    foldBar.innerHTML = `<span>👁️ Hidden ${reason} - Click to View</span>`;

    // Style the bar directly
    Object.assign(foldBar.style, {
        height: '32px',
        backgroundColor: theme.bgColor,
        border: `1px dashed ${theme.borderColor}`,
        color: theme.textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        cursor: 'pointer',
        borderRadius: '4px',
        margin: '4px 0',
        transition: 'all 0.2s',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    });

    // Add click handler to restore with animation
    foldBar.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();

        // 1. Make space visible but transparent
        contentEl.style.display = '';

        // 2. Remove bar
        foldBar.remove();

        // 3. Trigger reflow to enable transition
        void contentEl.offsetHeight;

        // 4. Fade in
        contentEl.style.opacity = '1';

        // Mark as manually revealed so we don't re-collapse it immediately if logic runs again
        container.dataset.tidyfeedRevealed = 'true';
    };

    // Hover effect
    foldBar.onmouseenter = () => {
        foldBar.style.backgroundColor = theme.hoverColor;
    };
    foldBar.onmouseleave = () => {
        foldBar.style.backgroundColor = theme.bgColor;
    };

    container.appendChild(foldBar);
}

// Update the blocked ads counter in storage
async function incrementBlockedCount(): Promise<void> {
    try {
        const result = await chrome.storage.local.get('stats_ads_blocked');
        const currentCount = result.stats_ads_blocked || 0;
        await chrome.storage.local.set({ stats_ads_blocked: currentCount + 1 });
        console.log('[TidyFeed] Counter updated:', currentCount + 1);
    } catch (error) {
        console.error('[TidyFeed] Error updating blocked count:', error);
    }
}

// Process all visible tweet containers
function processAllTweets(): void {
    const containers = document.querySelectorAll<HTMLElement>('[data-testid="cellInnerDiv"]');

    containers.forEach((container) => {
        if (processTweetContainer(container)) {
            incrementBlockedCount();
        }
    });
}

/**
 * Initialize the Ad Blocker
 * Sets up MutationObserver to watch for new tweets
 */
export function initAdBlocker(): void {
    console.log('[TidyFeed] 🚀 Ad Blocker initialized');

    // Load settings (keywords + regex)
    loadSettings();

    console.log('[TidyFeed] Looking for tweets with data-testid="cellInnerDiv"');

    // Process existing tweets first
    processAllTweets();

    // Watch for new tweets being added to the DOM
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
        }

        if (shouldProcess) {
            // Use requestAnimationFrame to batch process
            requestAnimationFrame(() => {
                processAllTweets();
            });
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log('[TidyFeed] MutationObserver active');
}
