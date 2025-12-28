import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'TidyFeed - AdBlock & Downloader',
    description: 'Filter social media noise, capture valuable content.',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'cookies', 'identity'],
    host_permissions: [
      '*://*.x.com/*',
      '*://*.twitter.com/*',
      '*://cdn.syndication.twimg.com/*',
      '*://video.twimg.com/*',
      '*://pbs.twimg.com/*',
      'https://tidyfeed.app/*',
      'https://api.tidyfeed.app/*',
    ],
    oauth2: {
      client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile'],
    },
    action: {
      default_title: 'TidyFeed',
    },
  },
});
