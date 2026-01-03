import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  
  // Firefox 使用 Manifest v3
  // https://wxt.dev/guide/browsers/firefox.html
  manifestVersion: 3,
  
  manifest: {
    name: 'TidyFeed - AdBlock & Downloader',
    description: 'Filter social media noise, capture valuable content.',
    version: '0.0.1',
    
    // Manifest v3 的权限分离
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
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['*://*.x.com/*', '*://*.twitter.com/*'],
      },
    ],
    action: {
      default_title: 'TidyFeed',
    },

    // Firefox 特定的配置
    browser_specific_settings: {
      gecko: {
        // 必须是唯一的 ID，格式: {UUID} 或 user@example.com
        id: 'tidyfeed@tidyfeed.app',
        // Firefox 109+ 完全支持 Manifest v3
        strict_min_version: '109.0',
      },
    },
  },
});

