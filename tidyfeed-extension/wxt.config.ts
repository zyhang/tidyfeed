import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'TidyFeed - AdBlock & Downloader',
    description: 'Filter social media noise, capture valuable content.',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'cookies'],
    host_permissions: [
      '*://*.x.com/*',
      '*://*.twitter.com/*',
      '*://cdn.syndication.twimg.com/*',
      '*://video.twimg.com/*',
      '*://pbs.twimg.com/*',
      'https://tidyfeed.app/*',
      'https://api.tidyfeed.app/*',
      'https://*.googleusercontent.com/*', // Google profile avatars
      'http://localhost:*/*', // Local development
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' https://*.googleusercontent.com",
    },
    action: {
      default_title: 'TidyFeed',
    },
  },
});

