import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  // 支持多浏览器构建 (Chrome + Firefox)
  // 默认: npm run build 构建所有浏览器
  // Firefox: npm run build:firefox 或 npm run dev:firefox

  manifestVersion: 3,

  manifest: {
    name: 'TidyFeed - AdBlock & Downloader',
    description: 'Filter social media noise, capture valuable content.',
    version: '0.0.1',

    // 扩展图标（所有浏览器）
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
      256: 'icon/256.png',
      512: 'icon/512.png',
    },

    // Manifest v3 的权限分离
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'cookies', 'tabs'],
    host_permissions: [
      '*://*.x.com/*',
      '*://*.twitter.com/*',
      '*://cdn.syndication.twimg.com/*',
      '*://video.twimg.com/*',
      '*://pbs.twimg.com/*',
      '*://*.tidyfeed.app/*',
      'https://*.googleusercontent.com/*',
      '<all_urls>', // For Reader View feature on all websites
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
        id: 'tidyfeed@tidyfeed.app',
        strict_min_version: '109.0',
        // @ts-ignore: New property not yet in types
        data_collection_permissions: {
          required: ['none'],
          optional: []
        }
      },
    },
  },
});
