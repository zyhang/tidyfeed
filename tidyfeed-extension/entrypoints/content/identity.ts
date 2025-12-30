/**
 * Identify the current social platform
 */
function getPlatform(): string | null {
    const hostname = window.location.hostname;
    if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'x';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('reddit.com')) return 'reddit';
    return null;
}

/**
 * Initialize identity sync
 * Delegates the heavy lifting to the background script to bypass CSP restrictions
 */
export async function initIdentitySync() {
    const platform = getPlatform();
    if (!platform) return;

    // Check if synced recently (e.g. 24h)
    const lastSyncKey = `identity_sync_${platform}`;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    try {
        const storageData = await browser.storage.local.get(lastSyncKey);
        const lastSync = storageData[lastSyncKey];

        if (lastSync && typeof lastSync === 'number' && Date.now() - lastSync < ONE_DAY_MS) {
            console.log(`[TidyFeed] Identity for ${platform} already synced recently.`);
            return;
        }

        console.log(`[TidyFeed] Requesting identity sync for ${platform}...`);

        // Send message to background to handle extraction and API call
        // Background will use browser.scripting.executeScript which bypasses CSP
        const response = await browser.runtime.sendMessage({
            type: 'SYNC_PLATFORM_IDENTITY',
            platform
        });

        if (response && response.success) {
            console.log('[TidyFeed] Identity synced successfully:', response.username);
            await browser.storage.local.set({ [lastSyncKey]: Date.now() });
        } else if (response && response.skipped) {
            console.log('[TidyFeed] Identity sync skipped:', response.reason);
        } else {
            console.warn('[TidyFeed] Identity sync failed:', response?.error);
        }
    } catch (error) {
        console.error('[TidyFeed] Identity sync error:', error);
    }
}
