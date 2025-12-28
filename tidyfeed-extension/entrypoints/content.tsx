import { initAdBlocker } from './content/logic/adBlocker';
import { initTweetInjector } from './content/logic/injector';

// Content script for Twitter/X
// Headless - no UI injection, all UI is in the popup
export default defineContentScript({
    matches: ['*://*.x.com/*', '*://*.twitter.com/*'],

    async main() {
        console.log('[TidyFeed] Content script loaded (headless mode)');

        // Initialize the ad blocker (reads settings from storage)
        initAdBlocker();

        // Initialize the tweet button injector (download + block buttons)
        initTweetInjector();
    },
});
