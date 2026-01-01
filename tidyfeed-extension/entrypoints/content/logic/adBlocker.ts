/**
 * Ad Blocker Logic for Twitter/X
 * Uses MutationObserver to detect and hide promoted tweets
 * V2: Integrated with ScoringEngine for spam detection
 */

import {
    initScoringEngine,
    getScoringEngine,
    computeScore,
    isLegacyConfig,
    migrateLegacyConfig,
    type ScoringConfig,
    type TweetContext,
    type ScoreResult
} from './scoringEngine';

// Ad indicator texts (localized)
const AD_INDICATORS = ['Ad', 'Promoted', '广告', 'プロモーション', '광고', 'Gesponsert', 'Sponsorisé', 'Promocionado'];

// Module-level variables
let blockedKeywords: string[] = [];
let enableRegexFilter = false;
let debugScoring = false;
let showCollapseReason = true;

/**
 * Check if the extension context is still valid
 */
function isExtensionContextValid(): boolean {
    try {
        return !!chrome.runtime?.id;
    } catch {
        return false;
    }
}

// Load settings from storage
function loadSettings(): void {
    chrome.storage.local.get([
        'user_blocked_keywords',
        'scoring_config',
        'cloud_regex_list',
        'enable_regex_filter',
        'debug_scoring',
        'show_collapse_reason'
    ]).then((result: Record<string, unknown>) => {
        // Keywords
        if (result.user_blocked_keywords) {
            blockedKeywords = result.user_blocked_keywords as string[];
        }

        // Regex/Scoring Settings
        enableRegexFilter = (result.enable_regex_filter as boolean) || false;
        debugScoring = (result.debug_scoring as boolean) || false;
        showCollapseReason = result.show_collapse_reason !== false; // default true

        // Initialize scoring engine
        const scoringConfig = result.scoring_config as ScoringConfig | null;
        const cloudRegexList = result.cloud_regex_list as string[] | undefined;

        if (scoringConfig && scoringConfig.version === 2) {
            initScoringEngine(scoringConfig);
            console.log(`[TidyFeed] Scoring engine initialized with v2 config`);
        } else if (cloudRegexList && cloudRegexList.length > 0) {
            // Fallback to legacy config
            initScoringEngine(cloudRegexList);
            console.log(`[TidyFeed] Scoring engine initialized with legacy config (${cloudRegexList.length} patterns)`);
        }

        const engine = getScoringEngine();
        console.log(`[TidyFeed] Settings loaded. Keywords: ${blockedKeywords.length}, Scoring enabled: ${enableRegexFilter}, Rules: ${engine?.getRuleCount() || 0}`);
        processAllTweets();
    });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    let shouldReprocess = false;

    if (changes.user_blocked_keywords) {
        blockedKeywords = (changes.user_blocked_keywords.newValue as string[]) || [];
        shouldReprocess = true;
    }

    if (changes.enable_regex_filter) {
        enableRegexFilter = changes.enable_regex_filter.newValue as boolean;
        shouldReprocess = true;
    }

    if (changes.debug_scoring) {
        debugScoring = (changes.debug_scoring.newValue as boolean) || false;
    }

    if (changes.show_collapse_reason) {
        showCollapseReason = changes.show_collapse_reason.newValue !== false;
    }

    if (changes.scoring_config) {
        const newConfig = changes.scoring_config.newValue as ScoringConfig | null;
        if (newConfig && newConfig.version === 2) {
            initScoringEngine(newConfig);
            console.log('[TidyFeed] Scoring engine updated with v2 config');
        }
        shouldReprocess = true;
    }

    if (changes.cloud_regex_list) {
        const newList = (changes.cloud_regex_list.newValue as string[]) || [];
        if (newList.length > 0 && !getScoringEngine()) {
            initScoringEngine(newList);
            console.log('[TidyFeed] Scoring engine updated with legacy config');
        }
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
    const socialContextLinks = element.querySelectorAll('a[href*="/ads"], a[href*="business.x.com"]');
    if (socialContextLinks.length > 0) {
        return true;
    }

    // Method 2: Check for data-testid="placementTracking"
    const placementTracking = element.querySelector('[data-testid="placementTracking"]');
    if (placementTracking) {
        return true;
    }

    // Method 3: Look for specific ad/promoted text in small spans
    const allSpans = element.querySelectorAll('span');
    for (const span of allSpans) {
        const text = span.textContent?.trim();
        if (text && AD_INDICATORS.includes(text)) {
            const style = window.getComputedStyle(span);
            const fontSize = parseFloat(style.fontSize);
            if (fontSize <= 15) {
                return true;
            }
        }
    }

    // Method 4: Check for "Promoted" in aria-label
    const elementsWithAria = element.querySelectorAll('[aria-label*="Promoted"], [aria-label*="Ad"]');
    if (elementsWithAria.length > 0) {
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

// Extract tweet context for scoring
function extractTweetContext(element: Element): TweetContext | null {
    const tweetTextEl = element.querySelector('[data-testid="tweetText"]');
    if (!tweetTextEl) return null;

    const text = tweetTextEl.textContent || '';
    if (!text) return null;

    // Extract author handle
    let authorHandle: string | undefined;
    const userLinks = element.querySelectorAll('a[href^="/"][role="link"]');
    for (const link of userLinks) {
        const href = link.getAttribute('href');
        if (href && href.match(/^\/[a-zA-Z0-9_]+$/)) {
            authorHandle = href.replace('/', '');
            break;
        }
    }

    // Detect retweet (look for "Retweeted" or "reposted" indicators)
    const isRetweet = !!element.querySelector('[data-testid="socialContext"]')?.textContent?.match(/retweet|repost/i);

    // Detect reply
    const isReply = !!element.querySelector('[data-testid="reply"]');

    return {
        text,
        authorHandle,
        isRetweet,
        isReply,
    };
}

// Evaluate tweet with scoring engine
function evaluateTweetWithScoring(element: Element): ScoreResult | null {
    if (!enableRegexFilter) return null;

    const engine = getScoringEngine();
    if (!engine) return null;

    const context = extractTweetContext(element);
    if (!context) return null;

    const result = computeScore(context);

    if (debugScoring && result) {
        console.log('[TidyFeed Scoring]', result.debugSummary);
    }

    return result;
}

// Process a single tweet container
function processTweetContainer(container: HTMLElement): boolean {
    if (container.dataset.tidyfeedProcessed === 'true') {
        if (container.dataset.tidyfeedRevealed === 'true') {
            return false;
        }
        return false;
    }

    // Check for Ads (always collapse)
    if (isAdTweet(container)) {
        container.dataset.tidyfeedProcessed = 'true';
        collapseTweet(container, 'Ad', null);
        console.log('[TidyFeed] 🚫 Collapsed ad tweet');
        return true;
    }

    // Check for Keywords (always collapse)
    const matchedKeyword = isKeywordTweet(container);
    if (matchedKeyword) {
        container.dataset.tidyfeedProcessed = 'true';
        collapseTweet(container, `Keyword: ${matchedKeyword}`, null);
        console.log(`[TidyFeed] 🚫 Collapsed keyword tweet: ${matchedKeyword}`);
        return true;
    }

    // Check with Scoring Engine (only collapse if action is COLLAPSE)
    const scoreResult = evaluateTweetWithScoring(container);
    if (scoreResult && scoreResult.action === 'COLLAPSE') {
        container.dataset.tidyfeedProcessed = 'true';

        // Build reason string
        let reason = 'AI Smart Filter';
        if (showCollapseReason && scoreResult.matchedRules.length > 0) {
            const topRules = scoreResult.matchedRules
                .sort((a, b) => b.score - a.score)
                .slice(0, 2)
                .map(r => r.name)
                .join(', ');
            reason = `Score: ${scoreResult.score} (${topRules})`;
        }

        collapseTweet(container, reason, scoreResult);
        console.log(`[TidyFeed] 🚫 Collapsed by scoring: ${scoreResult.debugSummary}`);
        return true;
    }

    container.dataset.tidyfeedProcessed = 'true';
    return false;
}

// Detect current theme context
function getThemeContext(): { isDark: boolean; bgColor: string; borderColor: string; textColor: string; hoverColor: string } {
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const rgb = bodyBg.match(/\d+/g);
    let isDark = false;

    if (rgb && rgb.length >= 3) {
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        isDark = brightness < 128;
    }

    if (isDark) {
        return {
            isDark: true,
            bgColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textColor: '#71767B',
            hoverColor: 'rgba(255, 255, 255, 0.1)'
        };
    } else {
        return {
            isDark: false,
            bgColor: 'rgba(0, 0, 0, 0.03)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            textColor: '#536471',
            hoverColor: 'rgba(0, 0, 0, 0.06)'
        };
    }
}

/**
 * Collapse a tweet into a clickable bar instead of removing it entirely
 */
function collapseTweet(container: HTMLElement, reason: string, scoreResult: ScoreResult | null): void {
    const tweetContent = container.querySelector('article');
    if (!tweetContent) {
        container.style.display = 'none';
        return;
    }

    const userHandle = extractUserHandle(container);

    const contentEl = tweetContent as HTMLElement;
    contentEl.style.display = 'none';
    contentEl.style.opacity = '0';
    contentEl.style.transition = 'opacity 0.3s ease';

    const theme = getThemeContext();

    const foldBar = document.createElement('div');
    foldBar.className = 'tidyfeed-fold-bar';

    // Show detailed reason if scoring result available and debug enabled
    let displayReason = reason;
    if (scoreResult && showCollapseReason) {
        displayReason = `Score: ${scoreResult.score}`;
        if (scoreResult.matchedRules.length > 0) {
            const topRule = scoreResult.matchedRules.sort((a, b) => b.score - a.score)[0];
            displayReason += ` (${topRule.name})`;
        }
        if (scoreResult.overrideApplied) {
            displayReason += ' ⚠️';
        }
    }

    foldBar.innerHTML = `
        <span class="tidyfeed-fold-text">👁️ Hidden: ${displayReason} - Click to View</span>
        <button class="tidyfeed-block-btn" title="Block & Report this account">🚫 Block</button>
    `;

    Object.assign(foldBar.style, {
        height: '36px',
        backgroundColor: theme.bgColor,
        border: `1px dashed ${theme.borderColor}`,
        color: theme.textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        cursor: 'pointer',
        borderRadius: '4px',
        margin: '4px 0',
        padding: '0 12px',
        transition: 'all 0.2s',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    });

    const blockBtn = foldBar.querySelector('.tidyfeed-block-btn') as HTMLButtonElement;
    if (blockBtn) {
        Object.assign(blockBtn.style, {
            background: 'transparent',
            border: '1px solid rgba(244, 67, 54, 0.5)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            color: '#f44336',
            transition: 'all 0.2s'
        });

        blockBtn.onmouseenter = () => {
            blockBtn.style.background = 'rgba(244, 67, 54, 0.1)';
            blockBtn.style.borderColor = '#f44336';
        };
        blockBtn.onmouseleave = () => {
            blockBtn.style.background = 'transparent';
            blockBtn.style.borderColor = 'rgba(244, 67, 54, 0.5)';
        };

        blockBtn.onclick = async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const { reportBlock } = await import('./reporter');
            container.style.display = 'none';
            container.dataset.tidyfeedBlocked = 'true';
            await reportBlock(userHandle, userHandle, reason);
            console.log(`[TidyFeed] 🚫 Blocked and reported: ${userHandle}`);
        };
    }

    const textSpan = foldBar.querySelector('.tidyfeed-fold-text') as HTMLElement;
    if (textSpan) {
        textSpan.style.cursor = 'pointer';
        textSpan.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            contentEl.style.display = '';
            foldBar.remove();
            void contentEl.offsetHeight;
            contentEl.style.opacity = '1';
            container.dataset.tidyfeedRevealed = 'true';
        };
    }

    foldBar.onmouseenter = () => {
        foldBar.style.backgroundColor = theme.hoverColor;
    };
    foldBar.onmouseleave = () => {
        foldBar.style.backgroundColor = theme.bgColor;
    };

    container.appendChild(foldBar);
}

/**
 * Extract user handle from a tweet container
 */
function extractUserHandle(container: HTMLElement): string {
    const userLinks = container.querySelectorAll('a[href^="/"][role="link"]');
    for (const link of userLinks) {
        const href = link.getAttribute('href');
        if (href && href.match(/^\/[a-zA-Z0-9_]+$/)) {
            return href.replace('/', '');
        }
    }

    const statusLink = container.querySelector('a[href*="/status/"]');
    if (statusLink) {
        const href = statusLink.getAttribute('href') || '';
        const match = href.match(/\/([^/]+)\/status\//);
        if (match) {
            return match[1];
        }
    }

    return 'unknown';
}

// Update the blocked ads counter in storage
async function incrementBlockedCount(): Promise<void> {
    if (!isExtensionContextValid()) return;

    try {
        const result = await chrome.storage.local.get('stats_ads_blocked');
        const currentCount = (result.stats_ads_blocked as number) || 0;
        await chrome.storage.local.set({ stats_ads_blocked: currentCount + 1 });
    } catch (error) {
        // Silently ignore extension context errors
        if (String(error).includes('Extension context invalidated')) return;
        console.error('[TidyFeed] Error updating blocked count:', error);
    }
}

// Process all visible tweet containers
function processAllTweets(): void {
    if (!isExtensionContextValid()) return;

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
    console.log('[TidyFeed] 🚀 Ad Blocker initialized (with Scoring Engine)');

    loadSettings();

    processAllTweets();

    const observer = new MutationObserver((mutations) => {
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
            console.warn('[TidyFeed AdBlocker] Extension context invalidated, disconnecting observer');
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
                processAllTweets();
            });
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log('[TidyFeed] MutationObserver active');
}
