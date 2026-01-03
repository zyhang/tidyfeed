# TidyFeed Firefox 支持 - 快速实施指南

## 📌 当前状态评估

```
✅ 已有功能:
- WXT 框架已完全支持 Firefox
- package.json 已有 dev:firefox 和 build:firefox 命令
- Manifest v3 配置已完成

⚠️  需要检查/优化:
- browser API 调用的 Firefox 兼容性
- web_accessible_resources 的 Firefox 格式
- CSP 安全策略的 Firefox 兼容性
- 权限申请的完整性
```

---

## 🚀 立即可执行的步骤

### 步骤 1: 验证当前构建 (5分钟)

```bash
cd /Users/yihang/Documents/Projects/tidyfeed/tidyfeed-extension

# 测试 Chrome 版本构建
npm run build

# 测试 Firefox 版本构建
npm run build:firefox

# 检查输出目录
ls -la dist/
```

**预期结果**:
```
dist/
├── chrome/     <- Chrome Manifest v3
└── firefox/    <- Firefox Manifest v3
```

---

### 步骤 2: 检查 Firefox Manifest 差异 (10分钟)

```bash
# 对比两个 manifest.json
diff dist/chrome/manifest.json dist/firefox/manifest.json

# 输出应该显示:
# - Firefox 有 "browser_specific_settings" 字段（WXT 自动添加）
# - 权限字段相同
# - CSP 兼容
```

---

### 步骤 3: 浏览器兼容性检查 (15分钟)

需要检查以下文件中的 API 使用:

```typescript
// entrypoints/background.ts
// ✅ 检查项目:
- browser.storage.local 调用   // Firefox 支持 ✅
- browser.alarms 调用          // Firefox 支持 ✅
- browser.tabs 调用            // Firefox 支持 ✅
- fetch() 调用                 // 跨浏览器 ✅

// entrypoints/content.tsx
// ✅ 检查项目:
- 内容脚本注入                 // Firefox 支持 ✅
- DOM 操作                     // Firefox 支持 ✅
- Storage 访问                 // Firefox 支持 ✅
```

---

### 步骤 4: 创建浏览器兼容性层 (可选但推荐)

```bash
# 创建兼容性工具文件
cat > /Users/yihang/Documents/Projects/tidyfeed/tidyfeed-extension/src/lib/browserCompat.ts << 'EOF'
/**
 * 浏览器兼容性工具
 * 在 Chrome 和 Firefox 之间提供统一的 API 接口
 */

export type BrowserType = 'chrome' | 'firefox' | 'unknown';

/**
 * 检测当前浏览器类型
 */
export function detectBrowser(): BrowserType {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('firefox')) {
    return 'firefox';
  }
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return 'chrome';
  }
  
  return 'unknown';
}

/**
 * 检查是否为特定浏览器
 */
export function isBrowser(name: BrowserType): boolean {
  return detectBrowser() === name;
}

/**
 * 获取浏览器 API (统一接口)
 * Firefox: 使用 browser.* API
 * Chrome: 通过 WXT 兼容层访问
 */
export const apiCompat = {
  // 获取存储值
  getStorageValue: async <T = any>(key: string, defaultValue?: T): Promise<T> => {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] ?? defaultValue;
    } catch (error) {
      console.error(`[TidyFeed] Storage get failed: ${key}`, error);
      return defaultValue as T;
    }
  },

  // 设置存储值
  setStorageValue: async (key: string, value: any): Promise<void> => {
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`[TidyFeed] Storage set failed: ${key}`, error);
    }
  },

  // 批量获取存储
  getStorageAll: async (): Promise<Record<string, any>> => {
    try {
      return await browser.storage.local.get();
    } catch (error) {
      console.error('[TidyFeed] Storage getAll failed', error);
      return {};
    }
  },

  // 删除存储值
  removeStorageValue: async (key: string): Promise<void> => {
    try {
      await browser.storage.local.remove(key);
    } catch (error) {
      console.error(`[TidyFeed] Storage remove failed: ${key}`, error);
    }
  },

  // 清空所有存储
  clearStorage: async (): Promise<void> => {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error('[TidyFeed] Storage clear failed', error);
    }
  },
};

/**
 * Firefox 特定的日志记录
 */
export function log(message: string, data?: any): void {
  const prefix = `[TidyFeed-${detectBrowser().toUpperCase()}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}
EOF
```

---

### 步骤 5: 本地 Firefox 测试 (20分钟)

#### 5a. 加载扩展

```bash
# 1. 打开 Firefox
open -a Firefox

# 2. 访问 about:debugging#/runtime/this-firefox
# (或在地址栏输入: about:debugging#/runtime/this-firefox)

# 3. 点击 "加载临时附加组件"

# 4. 选择文件:
/Users/yihang/Documents/Projects/tidyfeed/tidyfeed-extension/dist/firefox/manifest.json
```

#### 5b. 功能测试

```bash
# 在 Firefox 中访问: https://x.com
# 进行以下测试:

✅ 扩展图标是否显示
✅ 点击图标，弹窗是否打开
✅ 弹窗 UI 是否正常加载
✅ 检查浏览器控制台是否有错误
  - F12 -> Console 标签
  - 查看 [TidyFeed] 开头的日志
```

#### 5c. 检查权限申请

```javascript
// 在浏览器控制台运行:
await browser.storage.local.get()
// 如果返回对象，说明权限配置正确 ✅

// 测试 Alarm
await browser.alarms.create('test', { periodInMinutes: 1 })
// 如果无错误，说明权限配置正确 ✅
```

---

## 🎯 快速检查清单 (必须完成)

### 配置检查

- [ ] `wxt.config.ts` 中 manifest permissions 完整
  ```
  需要包含: storage, activeTab, scripting, alarms, cookies
  ```

- [ ] `wxt.config.ts` 中 manifest host_permissions 完整
  ```
  需要包含: *.x.com, *.twitter.com, API端点, 本地开发
  ```

- [ ] `wxt.config.ts` 中 web_accessible_resources 正确
  ```
  Firefox 格式应该是:
  {
    resources: ['injected.js'],
    matches: ['*://*.x.com/*', '*://*.twitter.com/*']
  }
  ```

### 代码检查

- [ ] background.ts 中所有 `browser.*` 调用都有错误处理
- [ ] content.tsx 中 DOM 操作没有浏览器特定代码
- [ ] 所有第三方库支持 Firefox (file-saver, jszip 都支持)
- [ ] 没有使用 Chrome 专有的 APIs (chrome.offscreen 等)

### 构建检查

- [ ] `npm run build` 成功完成
- [ ] `npm run build:firefox` 成功完成
- [ ] dist/firefox/manifest.json 存在且有效
- [ ] 没有 TypeScript 编译错误

### 测试检查

- [ ] Firefox 本地测试：扩展正常加载
- [ ] Firefox 本地测试：UI 正常显示
- [ ] Firefox 本地测试：权限正常申请
- [ ] Firefox 本地测试：功能正常运行
- [ ] Firefox 开发者工具无错误

---

## 📊 Firefox vs Chrome API 对比

| API 功能 | Chrome | Firefox | WXT 支持 |
|---------|--------|---------|---------|
| storage.local | ✅ | ✅ | ✅ |
| alarms | ✅ | ✅ | ✅ |
| tabs | ✅ | ✅ | ✅ |
| scripting | ✅ | ✅ | ✅ |
| cookies | ✅ | ✅ | ✅ |
| fetch | ✅ | ✅ | ✅ |
| DOM 操作 | ✅ | ✅ | ✅ |

**结论**: 当前项目使用的所有 API 都是跨浏览器兼容的 ✅

---

## 🔥 常见问题速解

### Q1: 构建后没有 dist/firefox 文件夹

**解决**:
```bash
# 确保 package.json 的 wxt 版本 >= 0.20.0
npm list wxt

# 如果版本过低，更新:
npm update wxt

# 重新构建:
npm run build:firefox
```

### Q2: Firefox 加载扩展提示"manifest.json 格式错误"

**解决**:
```bash
# 检查 manifest 是否有 gecko 配置
cat dist/firefox/manifest.json | grep -i gecko

# 如果没有，在 wxt.config.ts 中添加:
browser_specific_settings: {
  gecko: {
    id: 'tidyfeed@tidyfeed.app',
    strict_min_version: '109.0'
  }
}
```

### Q3: Firefox 中存储不工作

**解决**:
```javascript
// 在控制台测试权限
await browser.storage.local.set({ test: 'value' })
await browser.storage.local.get('test')
// 如果有错误，说明 manifest 中缺少 'storage' 权限
```

### Q4: 内容脚本没有注入到页面

**解决**:
```bash
# 检查 content.tsx 中的 matches 是否正确
# 应该是: ['*://*.x.com/*', '*://*.twitter.com/*']

# 在 Firefox about:debugging 中检查:
# - 选择扩展
# - 查看 "Manifest" 标签
# - 检查 content_scripts 是否正确显示
```

---

## 🎬 下一步行动

### 立即执行（今天）
1. 运行 `npm run build:firefox` 验证构建
2. 在 Firefox 中加载并测试
3. 记录遇到的任何错误

### 本周内完成
1. 修复任何兼容性问题
2. 添加浏览器检测工具函数（可选）
3. 完整的功能测试

### 发布前准备
1. 创建 Firefox Add-ons 账号 (https://addons.mozilla.org)
2. 准备扩展截图和描述
3. 提交 Firefox 商店审核

---

## 📞 需要帮助？

如果遇到以下问题，参考相应链接:

- **WXT 文档**: https://wxt.dev
- **Firefox WebExtensions**: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions
- **Chrome Extensions**: https://developer.chrome.com/docs/extensions/
- **Manifest v3**: https://developer.chrome.com/docs/extensions/mv3/

---

**预计完成时间**: 1-2 小时 ⏱️

**难度级别**: 🟢 简单 (WXT 已处理大部分兼容性问题)
