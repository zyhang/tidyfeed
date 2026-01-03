# TidyFeed Firefox 插件支持计划

## 📋 执行概述

当前项目使用 **WXT框架**，它完美支持多浏览器打包（Chrome 和 Firefox）。已有基础 Firefox 命令但需要优化和完整实现。

**当前状态**: ✅ WXT已支持Firefox构建，❌ 需要完整的Firefox兼容性检查和优化

---

## 🎯 详细执行路径

### Phase 1: 代码兼容性审计（必须项）

#### 1.1 检查 Firefox 特定的 API 差异
- [ ] **background.ts**: 检查所有 `browser` API 调用的Firefox兼容性
  - Firefox 支持 `browser.*` API（推荐）
  - Chrome 使用 `chrome.*` API，WXT 提供兼容层
  - 关键检查项：
    - `storage.local.set/get` ✅
    - `alarms` API（需要权限）✅
    - `tabs`, `scripting` API ✅
    - `cookies` 访问权限 ✅

- [ ] **content.tsx**: 验证内容脚本匹配模式
  - 模式 `*://*.x.com/*` ✅ Firefox 支持
  - 模式 `*://*.twitter.com/*` ✅ Firefox 支持
  - 需要在 manifest.json 中明确声明

#### 1.2 检查 manifest 兼容性
- [ ] **wxt.config.ts** 中的权限字段
  - `permissions`: 所有权限 Firefox 都支持 ✅
  - `host_permissions`: 需要明确列出（Firefox 更严格）
  - `web_accessible_resources`: Firefox 语法略有不同，需要检查

#### 1.3 检查第三方库兼容性
- [ ] **file-saver**: 跨浏览器支持 ✅
- [ ] **jszip**: 跨浏览器支持 ✅
- [ ] **React 19**: 跨浏览器支持 ✅

---

### Phase 2: 修改配置文件（可执行步骤）

#### 2.1 更新 wxt.config.ts 添加 Firefox 特定配置

**目标文件**: `wxt.config.ts`

```typescript
// 添加以下配置到 defineConfig 中：

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  
  // ✅ 新增：浏览器特定配置
  browser: 'all', // 同时支持 Chrome 和 Firefox
  
  manifest: {
    name: 'TidyFeed - AdBlock & Downloader',
    description: 'Filter social media noise, capture valuable content.',
    
    // ✅ 分离权限定义（支持两个浏览器）
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'cookies'],
    host_permissions: [
      '*://*.x.com/*',
      '*://*.twitter.com/*',
      '*://cdn.syndication.twimg.com/*',
      '*://video.twimg.com/*',
      '*://pbs.twimg.com/*',
      'https://tidyfeed.app/*',
      'https://api.tidyfeed.app/*',
      'https://*.googleusercontent.com/*',
      'http://localhost:*/*',
    ],
    
    // ✅ 修改：Firefox 兼容的 CSP
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' https://*.googleusercontent.com data:",
    },
    
    // ✅ 修改：Firefox 兼容的 web_accessible_resources
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['*://*.x.com/*', '*://*.twitter.com/*'],
      },
    ],
    
    // ✅ 新增：Firefox 特定字段
    browser_specific_settings: {
      gecko: {
        id: 'tidyfeed@tidyfeed.app', // 必须设置Firefox插件ID
        strict_min_version: '109.0', // Firefox 支持 Manifest v3 的最低版本
      }
    },
    
    action: {
      default_title: 'TidyFeed',
    },
  },
});
```

---

### Phase 3: 代码层面兼容性修复

#### 3.1 创建浏览器兼容性工具类

**新建文件**: `src/lib/browserCompat.ts`

```typescript
/**
 * 浏览器兼容性工具 - 处理 Chrome/Firefox API 差异
 */

// 统一的 Browser API 接口
export const browserAPI = {
  // 存储 API
  storage: {
    local: {
      get: async (keys?: string | string[]) => {
        return await browser.storage.local.get(keys);
      },
      set: async (items: Record<string, any>) => {
        return await browser.storage.local.set(items);
      },
      remove: async (keys: string | string[]) => {
        return await browser.storage.local.remove(keys);
      },
      clear: async () => {
        return await browser.storage.local.clear();
      },
    },
  },

  // Tabs API
  tabs: {
    query: async (queryInfo: any) => {
      return await browser.tabs.query(queryInfo);
    },
    executeScript: async (tabId: number, details: any) => {
      return await browser.scripting.executeScript({
        target: { tabId },
        ...details,
      });
    },
  },

  // Alarms API
  alarms: {
    create: async (name: string, alarmInfo: any) => {
      return await browser.alarms.create(name, alarmInfo);
    },
    onAlarm: browser.alarms.onAlarm,
  },

  // Cookies API
  cookies: {
    get: async (details: any) => {
      return await browser.cookies.get(details);
    },
    getAll: async (storeId?: string) => {
      return await browser.cookies.getAll(storeId ? { storeId } : {});
    },
  },
};

// 环境检测
export const getEnvironment = (): 'chrome' | 'firefox' | 'unknown' => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('firefox')) {
      return 'firefox';
    }
    return 'chrome';
  }
  return 'unknown';
};

// Firefox 特定的功能检测
export const isBrowser = (name: 'firefox' | 'chrome'): boolean => {
  return getEnvironment() === name;
};
```

#### 3.2 修改 background.ts 使用兼容性层

**关键点**：确保所有 `browser.*` 调用都正确处理

```typescript
// 检查清单：
- 将所有 `browser.storage.local` 改为 `browserAPI.storage.local` ✅
- 将所有 `browser.alarms` 改为 `browserAPI.alarms` ✅
- 处理 Firefox 中 `cookies` 权限的限制
- 测试跨域请求处理
```

---

### Phase 4: Manifest 优化

#### 4.1 处理 Firefox 的 manifest.json 差异

**WXT 自动处理**，但需要验证的点：

```typescript
// Firefox 需要额外检查：
1. ✅ content_security_policy: 
   - Firefox 不支持 'strict-dynamic'
   - 确保使用兼容的 CSP
   
2. ✅ web_accessible_resources:
   - Firefox 和 Chrome 需要不同的语法
   - WXT 会自动转换，但需要验证

3. ✅ icons:
   - 必须提供（推荐 16, 32, 48, 128）
   - Firefox 要求更严格

4. ✅ browser_specific_settings:
   - Firefox 需要 gecko.id
   - Chrome 可以省略
```

---

### Phase 5: 构建和测试

#### 5.1 构建流程

```bash
# 1. Chrome 开发版本
npm run dev
# 或
npm run build

# 2. Firefox 开发版本 ✅ 已支持
npm run dev:firefox
# 或
npm run build:firefox

# 3. 创建可分发包
npm run zip           # Chrome
npm run zip:firefox   # Firefox
```

#### 5.2 Firefox 加载测试步骤

```
1. 打开 Firefox 浏览器
2. 访问 about:debugging#/runtime/this-firefox
3. 点击 "加载临时附加组件"
4. 选择 dist/firefox/manifest.json
5. 访问 x.com 进行功能测试
```

#### 5.3 测试检查清单

```
UI 功能测试:
- [ ] 弹窗 UI 正常显示
- [ ] 推文下载功能正常
- [ ] 过滤规则正常应用
- [ ] 存储功能正常

API 调用测试:
- [ ] 云端同步规则成功
- [ ] 后端 API 调用正常
- [ ] 存储读写无问题
- [ ] Alarm 计时器正常

权限测试:
- [ ] 可以访问 Twitter/X 页面
- [ ] 可以修改页面 DOM
- [ ] 可以访问 cookies
- [ ] 可以访问本地存储

性能测试:
- [ ] 加载时间 < 500ms
- [ ] 内存占用正常
- [ ] 无内存泄漏
```

---

### Phase 6: Firefox 发布准备

#### 6.1 创建 Firefox 扩展签名配置

**新建文件**: `.firefox-env` (不上传到git)

```bash
# Firefox Web Ext 签名配置（可选但推荐）
FIREFOX_API_KEY=your_api_key_here
FIREFOX_API_SECRET=your_api_secret_here
```

#### 6.2 更新 package.json 脚本

**已有支持**，无需修改：

```json
{
  "scripts": {
    "dev:firefox": "wxt -b firefox",
    "build:firefox": "wxt build -b firefox",
    "zip:firefox": "wxt zip -b firefox",
    "sign:firefox": "web-ext sign --api-key=${FIREFOX_API_KEY} --api-secret=${FIREFOX_API_SECRET}" // 可选
  }
}
```

---

## 🔧 具体代码修改计划

### 修改项 1: wxt.config.ts

**操作**: 添加 Firefox 支持配置和浏览器特定设置

### 修改项 2: 新建 src/lib/browserCompat.ts

**操作**: 创建浏览器兼容性工具函数

### 修改项 3: entrypoints/background.ts

**操作**: 替换 browser API 调用为兼容层

### 修改项 4: 所有 content 脚本

**操作**: 检查并统一 browser API 调用

---

## 📦 输出物清单

构建完成后将生成：

```
dist/
├── chrome/                 # Chrome 版本
│   ├── manifest.json
│   ├── popup/
│   ├── background.js
│   └── content.js
│
└── firefox/                # Firefox 版本
    ├── manifest.json       # (Firefox 兼容)
    ├── popup/
    ├── background.js
    └── content.js
```

可分发包：

```
dist/
├── tidyfeed-chrome.zip     # Chrome Web Store
└── tidyfeed-firefox.xpi    # Firefox Add-ons Store
```

---

## 🚀 发布渠道

| 平台 | 链接 | 步骤 |
|------|------|------|
| **Chrome Web Store** | https://chrome.google.com/webstore | 1. 上传 zip 2. 填写信息 3. 审核 |
| **Firefox Add-ons** | https://addons.mozilla.org | 1. 上传 xpi 2. 源码提交 3. 审核 |

---

## ⏱️ 时间估计

| 阶段 | 任务 | 时长 |
|------|------|------|
| Phase 1 | 兼容性审计 | 1-2小时 |
| Phase 2 | 配置修改 | 30分钟 |
| Phase 3 | 代码兼容性修复 | 1-2小时 |
| Phase 4 | Manifest优化 | 30分钟 |
| Phase 5 | 构建和测试 | 1-2小时 |
| **总计** | | **4-7小时** |

---

## 🎯 优先级和关键点

### 高优先级（必须做）
1. ✅ 配置 wxt.config.ts Firefox 支持
2. ✅ 创建浏览器兼容性工具类
3. ✅ 测试所有权限在 Firefox 中是否生效
4. ✅ 本地 Firefox 测试

### 中优先级（应该做）
1. 优化 CSP 头以支持 Firefox 特定需求
2. 添加 web_accessible_resources 的 Firefox 特定配置
3. 性能测试

### 低优先级（可以做）
1. Firefox Add-ons 商店发布
2. 签名证书配置
3. 自动化 CI/CD 构建

---

## 🔍 常见问题解决

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| Firefox 加载失败 | manifest.json 格式错误 | 检查 gecko.id 是否正确 |
| 权限申请弹窗过多 | host_permissions 定义不当 | 合并相关权限 |
| 内容脚本不运行 | matches 模式不兼容 | 使用通配符 `*://` |
| 存储读写失败 | Firefox 权限限制 | 使用 storage 权限 |
| 跨域请求失败 | CSP 限制 | 添加到 host_permissions |

---

## ✅ 验收标准

- [ ] 代码通过 TypeScript 编译（零错误）
- [ ] Chrome 版本正常构建并功能完整
- [ ] Firefox 版本正常构建且功能与Chrome版本一致
- [ ] 所有权限在Firefox中正确申请
- [ ] 本地测试通过（见 Phase 5 测试清单）
- [ ] 无控制台错误和警告
