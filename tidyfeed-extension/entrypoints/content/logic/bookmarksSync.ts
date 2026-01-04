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
export async function injectSyncButton(): Promise<void> {
    // Only run on bookmarks page
    if (!window.location.pathname.includes('/i/bookmarks')) {
        return;
    }

    console.log('[TidyFeed] Checker: on bookmarks page');

    // Remove existing button if any (renavigation case)
    const existing = document.getElementById('tidyfeed-sync-btn');
    if (existing) {
        console.log('[TidyFeed] Button already exists');
        return;
    }

    // Improved Header Finder
    const findHeader = (): Element | null => {
        // 1. Look for the "Bookmarks" title
        // In most languages, we trust the `h2[role="heading"]` is the main title on this page
        // because it is the primary column.
        const headings = document.querySelectorAll('main h2[role="heading"]');
        for (const h of headings) {
            // The header bar is usually the parent's parent or similar. 
            // We look for a container that has `align-items: center` or `flex-direction: row`
            const parent = h.closest('div[style*="flex-direction: row"]') ||
                h.parentElement?.parentElement; // Fallback

            if (parent) return parent;
        }

        // 2. Fallback: specific testid for primary column header
        const primaryCol = document.querySelector('[data-testid="primaryColumn"]');
        if (primaryCol) {
            // Usually the first div is the header
            const header = primaryCol.querySelector('div > div > div > div[role="banner"] h2');
            if (header) {
                return header.closest('div[style*="flex-direction: row"]');
            }
        }
        return null;
    };

    // Retry finding header a few times as page loads
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (attempts > 40) { // 20s timeout
            clearInterval(interval);
            console.log('[TidyFeed] Failed to find header for Sync Button');
            return;
        }

        const headerContainer = findHeader();

        if (headerContainer) {
            clearInterval(interval);
            console.log('[TidyFeed] Found header, injecting button...');

            // Create Button
            const btn = document.createElement('button');
            btn.id = 'tidyfeed-sync-btn';
            btn.className = 'tidyfeed-sync-btn';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    <polyline points="9 11 12 14 22 4" />
                </svg>
                <span>${getLocaleString('sync_btn')}</span>
            `;

            Object.assign(btn.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '9999px',
                backgroundColor: 'rgb(239, 243, 244)', // Light gray
                color: '#0f1419',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginLeft: 'auto', // Push to right
                marginRight: '16px',
                zIndex: '10'
            });

            // Hover logs
            btn.onmouseenter = () => btn.style.backgroundColor = 'rgb(231, 235, 236)';
            btn.onmouseleave = () => btn.style.backgroundColor = 'rgb(239, 243, 244)';

            btn.onclick = startSyncProcess;

            // Insert
            headerContainer.appendChild(btn);
            console.log('[TidyFeed] Button injected successfully');
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
    // Initial check
    injectSyncButton();

    // Observer for navigation (SPA)
    // X uses pushState, so we need to poll or observe body
    let lastUrl = window.location.href;

    // Also interval check for safety
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            console.log('[TidyFeed] URL changed detected via poll:', lastUrl);
            setTimeout(injectSyncButton, 1000);
        }
    }, 2000);

    const observer = new MutationObserver(() => {
        const url = window.location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log('[TidyFeed] URL changed detected via observer:', lastUrl);
            setTimeout(injectSyncButton, 1000);
        } else {
            // If we are on the page but button is missing (React re-render), inject again
            if (url.includes('/i/bookmarks') && !document.getElementById('tidyfeed-sync-btn')) {
                // Debounce this slightly
                injectSyncButton();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
