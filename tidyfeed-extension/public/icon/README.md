# TidyFeed 扩展项目 - 图标配置说明

## 📦 图标资源

本目录包含 TidyFeed 浏览器扩展的图标资源。

### 可用图标尺寸
- `16.png` - 16x16px（工具栏/菜单项）
- `32.png` - 32x32px（地址栏图标）
- `48.png` - 48x48px（权限对话框）
- `96.png` - 96x96px（浏览器扩展管理页面）
- `128.png` - 128x128px（Chrome Web Store 显示）
- `256.png` - 256x256px（高分辨率显示）
- `512.png` - 512x512px（应用市场营销素材）
- `wxt.svg` - 矢量格式（开发用）

### 浏览器支持
- ✅ **Chrome** - 支持所有尺寸，推荐 128px 用于 Chrome Web Store
- ✅ **Firefox** - 支持所有尺寸，推荐 96px 和 128px
- ✅ **其他基于 Chromium 的浏览器** - Edge、Brave等

### 图标更新日期
- **更新时间**: 2026-01-03
- **图标格式**: PNG（所有尺寸）
- **配色**: 彩色渐变（红-橙-黄-紫-蓝）

### 参考配置

**Manifest.json 配置示例：**
```json
{
  "action": {
    "default_title": "TidyFeed",
    "default_popup": "popup.html",
    "default_icons": {
      "16": "public/icon/16.png",
      "32": "public/icon/32.png",
      "48": "public/icon/48.png",
      "128": "public/icon/128.png"
    }
  },
  "icons": {
    "16": "public/icon/16.png",
    "32": "public/icon/32.png",
    "48": "public/icon/48.png",
    "96": "public/icon/96.png",
    "128": "public/icon/128.png"
  }
}
```

### 构建和发布
- 图标在构建时会自动包含到浏览器扩展包中（.zip for Chrome, .xpi for Firefox）
- 所有图标对 Chrome 和 Firefox 都自动适用
- 修改此目录中的文件后，需要重新构建扩展

---
**相关文档**: [扩展项目 README](../README.md) | [Firefox 文档](docs/firefox/)
