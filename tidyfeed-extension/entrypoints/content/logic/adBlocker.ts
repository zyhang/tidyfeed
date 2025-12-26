/**
 * Ad Blocker Logic for Twitter/X
 * Uses MutationObserver to detect and hide promoted tweets
 */

// Ad indicator texts (localized)
const AD_INDICATORS = ['Ad', 'Promoted', '广告', 'プロモーション', '광고', 'Gesponsert', 'Sponsorisé', 'Promocionado'];

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

// Process a single tweet container
function processTweetContainer(container: HTMLElement): boolean {
    if (container.dataset.tidyfeedProcessed === 'true') {
        return false;
    }

    container.dataset.tidyfeedProcessed = 'true';

    if (isAdTweet(container)) {
        container.style.display = 'none';
        console.log('[TidyFeed] 🚫 Blocked ad tweet');
        return true;
    }

    return false;
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
