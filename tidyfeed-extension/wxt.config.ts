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
      // 'http://localhost:*/*', // Local development - Removed for Firefox validation
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
      // 注意: Firefox Manifest v3 不支持 default_icons 对象
      // Firefox 使用顶级 icons 字段，Chrome 会使用 default_icons 如果在此定义
      // 为保持兼容性，仅在此处定义 default_title，图标由顶级 icons 提供
    },

    // Firefox 特定的配置
    browser_specific_settings: {
      gecko: {
        // 必须是唯一的 ID，格式: {UUID} 或 user@example.com
        id: 'tidyfeed@tidyfeed.app',
        // Firefox 109+ 完全支持 Manifest v3
        // Bump to 140.0 to support data_collection_permissions without warning
        strict_min_version: '140.0',

        // Firefox 商店要求：数据收集权限声明 (2025年11月起强制)
        // https://extensionworkshop.com/documentation/publish/data-collection-permissions/
        // @ts-ignore: New property not yet in types
        data_collection_permissions: {
          // 必须包含 'required' 数组：列出需必的数据收集类型，或 'none'
          // 可选值: "authenticationInfo", "bookmarksInfo", "browsingActivity", "financialAndPaymentInfo", 
          // "healthInfo", "locationInfo", "personalCommunications", "personallyIdentifyingInfo", 
          // "searchTerms", "websiteActivity", "websiteContent"
          required: ['none'],

          // 可选收集 (optional) 也可以在此列出
          optional: []
        },
      },
    },
  },
});

