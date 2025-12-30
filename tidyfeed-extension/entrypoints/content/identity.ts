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
 * Extract Identity from X (Twitter)
 * Tries to find window.__INITIAL_STATE__ in script tags
 */
function extractXIdentity(): any | null {
    try {
        // Method 1: Search for script tag with window.__INITIAL_STATE__
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent || '';
            if (content.includes('window.__INITIAL_STATE__=')) {
                // Extract JSON
                const match = content.match(/window\.__INITIAL_STATE__=(.+?);$/m) ||
                    content.match(/window\.__INITIAL_STATE__=(.+?)(?:;|$)/);
                if (match && match[1]) {
                    try {
                        const state = JSON.parse(match[1]);
                        const session = state.session || {};
                        const user = state.entities?.users?.entities?.[session.user_id];

                        if (user) {
                            return {
                                platform: 'x',
                                platform_user_id: user.id_str,
                                platform_username: user.screen_name,
                                display_name: user.name,
                                avatar_url: user.profile_image_url_https?.replace('_normal', '_bigger')
                            };
                        }
                    } catch (e) {
                        console.warn('[TidyFeed] Failed to parse initial state JSON', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[TidyFeed] Error extracting X identity:', error);
    }
    return null;
}

/**
 * Detect user identity based on platform
 */
function detectIdentity(platform: string): any | null {
    switch (platform) {
        case 'x':
            return extractXIdentity();
        case 'instagram':
            // TODO: Implement Instagram detection
            return null;
        case 'reddit':
            // TODO: Implement Reddit detection
            return null;
        default:
            return null;
    }
}

/**
 * Initialize identity sync
 * Checks cache and syncs if needed
 */
export async function initIdentitySync() {
    const platform = getPlatform();
    if (!platform) return;

    // Check if synced recently (e.g. 24h)
    // Key format: local:identity_sync_{platform}
    const lastSyncKey = `local:identity_sync_${platform}`;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    try {
        const storageData = await browser.storage.local.get(lastSyncKey);
        const lastSync = storageData[lastSyncKey];

        if (lastSync && typeof lastSync === 'number' && Date.now() - lastSync < ONE_DAY_MS) {
            console.log(`[TidyFeed] Identity for ${platform} already synced recently.`);
            return;
        }

        console.log(`[TidyFeed] Attempting to detecting identity for ${platform}...`);

        // Attempt detection
        const identity = detectIdentity(platform);

        if (identity) {
            console.log('[TidyFeed] Detected Identity:', identity.platform_username);

            // Send to background to link
            try {
                const response = await browser.runtime.sendMessage({
                    type: 'LINK_SOCIAL_IDENTITY',
                    identity
                });

                if (response && response.success) {
                    console.log('[TidyFeed] Identity synced successfully');
                    await browser.storage.local.set({ [lastSyncKey]: Date.now() });
                } else {
                    console.warn('[TidyFeed] Identity sync failed:', response?.error);
                }
            } catch (error) {
                console.error('[TidyFeed] Error sending identity sync message:', error);
            }
        } else {
            console.log(`[TidyFeed] No identity detected for ${platform} (not logged in?)`);
        }
    } catch (error) {
        console.error('[TidyFeed] Storage access error:', error);
    }
}
