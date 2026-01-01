import { initAdBlocker } from './content/logic/adBlocker';
import { initTweetInjector } from './content/logic/injector';
import { initIdentitySync } from './content/identity';
import { initNetworkInterceptor } from './content/logic/networkInterceptor';

// Content script for Twitter/X
// Headless - no UI injection, all UI is in the popup
export default defineContentScript({
    matches: ['*://*.x.com/*', '*://*.twitter.com/*'],
    // Run at document_start to inject fetch interceptor before page makes API calls
    runAt: 'document_start',

    async main() {
        console.log('[TidyFeed] Content script loaded (headless mode)');

        // Initialize the network interceptor FIRST (captures full tweet text from GraphQL)
        // Must run before other initialization to intercept API calls
        await initNetworkInterceptor();

        // Wait for DOM to be ready for other initializations
        if (document.readyState === 'loading') {
            await new Promise<void>(resolve => {
                document.addEventListener('DOMContentLoaded', () => resolve());
            });
        }

        // Initialize the ad blocker (reads settings from storage)
        initAdBlocker();

        // Initialize the tweet button injector (download + block buttons)
        initTweetInjector();

        // Sync social identity
        initIdentitySync();
    },
});
