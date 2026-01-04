import { getLocaleString } from './locale';

/**
 * Sync X Bookmarks to TidyFeed
 * 
 * Features:
 * - Injects "Sync to TidyFeed" button in Bookmarks header
 * - Auto-scrolls to load bookmarks
 * - Listens to intercepted network requests for reliable data
 * - Diffs against local storage to avoid duplicates
 * - Shows elegant progress UI
 */

interface SyncProgress {
    total: number;
    synced: number;
    skipped: number;
    status: 'idle' | 'syncing' | 'completed' | 'error';
    error?: string;
}

// Global state for lock
let isSyncing = false;
let stopRequested = false;

// UI Constants
const PROGRESS_POPUP_ID = 'tidyfeed-sync-popup';

/**
 * Inject the Sync Button into the Bookmarks header
 */
// Singleton lock for injection process
let isInjecting = false;

/**
 * Inject the Sync Button into the Bookmarks header
 */
export async function injectSyncButton(): Promise<void> {
    // Only run on bookmarks page
    if (!window.location.pathname.includes('/i/bookmarks')) {
        return;
    }

    // Check if already exists (fast check)
    if (document.getElementById('tidyfeed-sync-btn')) {
        return;
    }

    // Prevent concurrent injection loops
    if (isInjecting) return;
    isInjecting = true;

    console.log('[TidyFeed] Starting injection process...');

    // Improved Header Finder
    const findHeader = (): Element | null => {
        const primaryCol = document.querySelector('[data-testid="primaryColumn"]');
        if (!primaryCol) {
            console.log('[TidyFeed] primaryColumn not found');
            return null;
        }

        const headings = primaryCol.querySelectorAll('h2[role="heading"]');
        const targetTitle = getLocaleString('x_bookmarks_title');

        for (const h of headings) {
            const hText = (h as HTMLElement).innerText || '';
            if (hText.includes(targetTitle)) {
                console.log(`[TidyFeed] Found heading with text: "${hText}"`);

                // The header row is usually a few levels up.
                // We want the container that has flex row to append our button.
                // It typically contains the title and maybe a "back" button or "more" menu.
                let current = h.parentElement;
                while (current && current !== primaryCol) {
                    // X uses specific classes for these things, but they change.
                    // However, the header row usually has a specific height or flex behavior.
                    // We look for a div that has more than just the heading as a child (e.g. back button)
                    if (current.tagName === 'DIV' && current.children.length >= 1) {
                        // Check if it's a flex row - simplified check
                        const style = window.getComputedStyle(current);
                        if (style.display === 'flex' && style.flexDirection === 'row') {
                            // This is likely the row container
                            return current;
                        }
                    }
                    current = current.parentElement;
                }

                // Fallback to parent if no flex row found
                return h.parentElement;
            }
        }

        return null;
    };

    // Retry finding header a few times
    let attempts = 0;
    const interval = setInterval(() => {
        try {
            attempts++;

            // Safety Break
            if (attempts > 60) { // 30s timeout
                clearInterval(interval);
                isInjecting = false;
                console.log('[TidyFeed] Timeout waiting for header. Last attempted at: ' + window.location.href);
                return;
            }

            // 1. Double check existence inside loop (Critical for race conditions)
            if (document.getElementById('tidyfeed-sync-btn')) {
                clearInterval(interval);
                isInjecting = false;
                return;
            }

            const headerContainer = findHeader();

            if (headerContainer) {
                clearInterval(interval);

                // Create Button
                const btn = document.createElement('button');
                btn.id = 'tidyfeed-sync-btn';
                btn.className = 'tidyfeed-sync-btn';

                // Minimalist Sync Icon (Circular arrows)
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 3.75c-4.55 0-8.25 3.69-8.25 8.25 0 1.28.29 2.51.8 3.61l1.53-1.02c-.21-.8-.33-1.63-.33-2.59 0-3.73 3.02-6.75 6.75-6.75 1.51 0 2.89.5 4.02 1.33l-2.02 2.02H21V3l-2.35 2.35c-1.74-1.6-4.07-2.6-6.65-2.6zM21.2 8.39l-1.53 1.02c.21.8.33 1.63.33 2.59 0 3.73-3.02 6.75-6.75 6.75-1.51 0-2.89-.5-4.02-1.33l2.02-2.02H3V21l2.35-2.35c1.74 1.6 4.07 2.6 6.65 2.6 4.55 0 8.25-3.69 8.25-8.25 0-1.28-.29-2.51-.8-3.61z"/>
                    </svg>
                    <div class="tf-sync-tooltip" style="
                        position: absolute;
                        bottom: -32px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.8);
                        color: white;
                        padding: 4px 10px;
                        border-radius: 44px;
                        font-size: 12px;
                        font-weight: 500;
                        white-space: nowrap;
                        pointer-events: none;
                        opacity: 0;
                        transition: opacity 0.2s;
                        z-index: 1000;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    ">
                        ${getLocaleString('sync_btn')}
                    </div>
                `;

                Object.assign(btn.style, {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    padding: '0',
                    borderRadius: '50%',
                    backgroundColor: 'transparent',
                    color: '#0f1419', // Default X color
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    marginLeft: '16px', // Comfortable padding to the right of the title
                    zIndex: '10'
                });

                // Hover effects
                btn.onmouseenter = () => {
                    btn.style.backgroundColor = 'rgba(15, 20, 25, 0.1)';
                    const tooltip = btn.querySelector('.tf-sync-tooltip') as HTMLElement;
                    if (tooltip) tooltip.style.opacity = '1';
                };
                btn.onmouseleave = () => {
                    btn.style.backgroundColor = 'transparent';
                    const tooltip = btn.querySelector('.tf-sync-tooltip') as HTMLElement;
                    if (tooltip) tooltip.style.opacity = '0';
                };

                btn.onclick = startSyncProcess;

                // Insert: Find the title and insert AFTER it for precise placement
                const titleHeading = headerContainer.querySelector('h2[role="heading"]');
                if (titleHeading && titleHeading.parentElement) {
                    // Ensure the parent is a row flex container to keep it "next to" rather than "on top"
                    titleHeading.parentElement.style.display = 'flex';
                    titleHeading.parentElement.style.flexDirection = 'row';
                    titleHeading.parentElement.style.alignItems = 'center';

                    titleHeading.parentElement.appendChild(btn);
                    console.log('[TidyFeed] Button injected after title heading');
                } else {
                    headerContainer.appendChild(btn);
                    console.log('[TidyFeed] Button appended to header container');
                }

                isInjecting = false;
            }
        } catch (e) {
            console.error('[TidyFeed] Error in injection loop:', e);
            clearInterval(interval);
            isInjecting = false;
        }
    }, 500);
}

/**
 * Main Sync Process
 */
async function startSyncProcess(e: MouseEvent) {
    e.preventDefault();
    if (isSyncing) return;

    // 1. Auth Check - Before showing any UI
    try {
        const authResult = await browser.runtime.sendMessage({ type: 'CHECK_AUTH' });
        if (!authResult?.authenticated) {
            alert(getLocaleString('login_alert'));
            window.open('https://tidyfeed.app/login', '_blank');
            return;
        }
    } catch {
        // Fallback if check fails
    }

    isSyncing = true;
    stopRequested = false;

    // 2. Show Progress Popup
    showProgressPopup();

    // 3. Initialize Loop state
    const stats: SyncProgress = { total: 0, synced: 0, skipped: 0, status: 'syncing' };
    const savedIds = await getSavedIds(); // From local storage
    let consecutiveSkipped = 0;
    const MAX_CONSECUTIVE_SKIPPED = 20; // Stop after 1 page of duplicates

    updateProgressUI(stats);

    // 4. Message Listener for Network Interceptor
    const messageHandler = async (event: MessageEvent) => {
        if (!isSyncing || event.source !== window || event.data?.type !== 'TIDYFEED_TWEET_DATA') return;

        const tweets = event.data.tweets as any[];
        let batchSaved = 0;
        let batchSkipped = 0;

        for (const tweet of tweets) {
            if (savedIds.includes(tweet.id)) {
                batchSkipped++;
                consecutiveSkipped++;
            } else {
                // New Tweet! Sync it.
                // We just need the ID. The backend will fetch metadata or we optimistically rely on ID.
                // Wait, the `injector.ts` sends full data. `bookmarksSync` receives `ExtractedTweet`.
                // We should ideally send full data to `save` to avoid backend re-fetching if possible, 
                // but `networkInterceptor` gives us nearly everything.

                // For now, simpler approach: Just send ID to background queue.
                // But `injector.ts` uses `TOGGLE_SAVE` which expects `postData`.
                // We can construct `postData` from `ExtractedTweet`.

                try {
                    const success = await saveTweetToTidyFeed(tweet);
                    if (success) {
                        savedIds.push(tweet.id);
                        batchSaved++;
                        consecutiveSkipped = 0; // Reset counter on success
                    } else {
                        // Failed to save (maybe auth error or limit)
                    }
                } catch (err) {
                    console.error('Sync save error', err);
                }
            }
        }

        stats.total += tweets.length;
        stats.synced += batchSaved;
        stats.skipped += batchSkipped;
        updateProgressUI(stats);

        // Stop Condition
        if (consecutiveSkipped >= MAX_CONSECUTIVE_SKIPPED) {
            stopSync('No new bookmarks found.');
        }
    };

    window.addEventListener('message', messageHandler);

    // 5. Scroll Loop
    const scrollInterval = setInterval(() => {
        if (stopRequested) {
            clearInterval(scrollInterval);
            window.removeEventListener('message', messageHandler);
            finishSync(stats);
            return;
        }

        // Scroll down
        window.scrollBy({ top: 1000, behavior: 'smooth' });

        // Check if reached bottom
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            // Maybe wait a bit? X loads infinitely.
        }
    }, 2000); // Scroll every 2s

}

async function saveTweetToTidyFeed(tweet: any): Promise<boolean> {
    const result = await browser.runtime.sendMessage({
        type: 'TOGGLE_SAVE',
        action: 'save',
        postData: {
            x_id: tweet.id,
            content: tweet.fullText,
            author: {
                name: tweet.authorName || '',
                handle: tweet.authorHandle || '',
                avatar: '' // We might miss avatar in network interceptor... acceptable fallback
            },
            media: [], // Interceptor might not parse media URLs deeply yet?
            url: `https://x.com/${tweet.authorHandle}/status/${tweet.id}`
        }
    });
    return result.success;
}

// ... UI Functions (Popup) ...

function showProgressPopup() {
    const popup = document.createElement('div');
    popup.id = PROGRESS_POPUP_ID;
    Object.assign(popup.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '320px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        borderRadius: '16px',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        zIndex: '999999',
        border: '1px solid rgba(0,0,0,0.05)',
        transform: 'translateY(100px)',
        opacity: '0',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    popup.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="font-size:16px; font-weight:700; margin:0; color:#1a1a1a;">${getLocaleString('syncing')}</h3>
            <button id="tidyfeed-stop-btn" style="background:none; border:none; color:#666; cursor:pointer; font-size:13px; font-weight:500;">${getLocaleString('stop')}</button>
        </div>
        <div style="margin-bottom:8px; display:flex; justify-content:space-between; font-size:13px; color:#555;">
            <span>${getLocaleString('synced_count')}: <b id="tf-synced-count">0</b></span>
            <span>${getLocaleString('skipped_count')}: <b id="tf-skipped-count">0</b></span>
        </div>
        <div style="height:4px; background:#f0f0f0; border-radius:2px; overflow:hidden;">
            <div id="tf-progress-bar" style="width:10%; height:100%; background:#00ba7c; border-radius:2px; transition:width 0.3s;"></div>
        </div>
        <div id="tf-status-msg" style="margin-top:10px; font-size:12px; color:#888;">${getLocaleString('scanning')}</div>
    `;

    document.body.appendChild(popup);

    // Animate in
    setTimeout(() => {
        popup.style.transform = 'translateY(0)';
        popup.style.opacity = '1';
    }, 10);

    document.getElementById('tidyfeed-stop-btn')?.addEventListener('click', () => {
        stopSync('Stopped by user');
    });
}

function updateProgressUI(stats: SyncProgress) {
    const syncedEl = document.getElementById('tf-synced-count');
    const skippedEl = document.getElementById('tf-skipped-count');
    const msgEl = document.getElementById('tf-status-msg');
    const barEl = document.getElementById('tf-progress-bar');

    if (syncedEl) syncedEl.textContent = stats.synced.toString();
    if (skippedEl) skippedEl.textContent = stats.skipped.toString();
    if (msgEl) msgEl.textContent = `Scanned ${stats.total} posts...`;

    // Indeterminate progress animation logic could go here
    // For now just keep it visually active
}

function stopSync(reason?: string) {
    stopRequested = true;
    const msgEl = document.getElementById('tf-status-msg');
    if (msgEl && reason) msgEl.textContent = reason;
}

function finishSync(stats: SyncProgress) {
    isSyncing = false;
    const popup = document.getElementById(PROGRESS_POPUP_ID);
    if (!popup) return;

    // Show completion state
    popup.innerHTML = `
        <div style="text-align:center; padding:10px 0;">
            <div style="width:40px; height:40px; background:#e8fdf5; color:#00ba7c; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style="font-size:16px; font-weight:700; margin:0 0 4px 0; color:#1a1a1a;">${getLocaleString('sync_complete')}</h3>
            <p style="margin:0; font-size:14px; color:#555;">${getLocaleString('sync_success_msg').replace('{n}', stats.synced.toString())}</p>
        </div>
    `;

    // Auto hide after 3s
    setTimeout(() => {
        popup.style.transform = 'translateY(100px)';
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 400);
    }, 3000);
}

async function getSavedIds(): Promise<string[]> {
    const storage = await browser.storage.local.get('saved_x_ids');
    return (storage.saved_x_ids as string[]) || [];
}

/**
 * Handle route changes to re-inject button
 */
export function initBookmarksSync() {
    console.log('[TidyFeed] Initializing Bookmarks Sync Logic...');
    // Initial check
    injectSyncButton();

    // Observer for navigation (SPA)
    // X uses pushState, so we need to poll or observe body
    let lastUrl = window.location.href;

    // Also interval check for safety (catch URL changes that don't trigger mutation immediately)
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            injectSyncButton();
        } else {
            // Periodically ensure button exists if we are on the page
            // This handles cases where X completely re-renders the DOM (e.g. back button)
            if (window.location.pathname.includes('/i/bookmarks')) {
                injectSyncButton();
            }
        }
    }, 1000);

    // Observer is still useful for immediate reaction to DOM changes (unmounting/remounting header)
    const observer = new MutationObserver(() => {
        if (window.location.pathname.includes('/i/bookmarks')) {
            injectSyncButton();
        }
    });

    // Use a lighter observation target if possible, but body is safest for full SPA route changes
    observer.observe(document.body, { childList: true, subtree: true });
}
