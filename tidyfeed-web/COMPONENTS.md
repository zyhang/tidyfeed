# TidyFeed Web 组件目录

本文档整理了 `tidyfeed-web` 中所有页面的组件，包括组件的命名、文件路径和用途，便于后续修改时快速定位。

---

## 📄 页面组件 (Pages)

| 页面路径 | 组件文件 | 组件名称 | 用途 |
|---------|---------|---------|------|
| `/app/page.tsx` | `app/page.tsx` | `SignInPage` | Google OAuth 登录入口 |
| `/app/home/page.tsx` | `app/home/page.tsx` | `LandingPage` | 营销落地页，含功能介绍和定价 |
| `/app/(dashboard)/dashboard/page.tsx` | `app/(dashboard)/dashboard/page.tsx` | `DashboardPage` | 主仪表盘，瀑布流展示收藏推文 |
| `/app/(dashboard)/dashboard/tags/page.tsx` | `app/(dashboard)/dashboard/tags/page.tsx` | `TagsPage` | 标签管理页面（CRUD） |
| `/app/(dashboard)/dashboard/settings/settings-page-client.tsx` | `app/(dashboard)/dashboard/settings/settings-page-client.tsx` | `SettingsPage` | 设置页面容器，多 Tab 布局 |
| `/app/(dashboard)/dashboard/settings/_components/profile-section.tsx` | `settings/_components/profile-section.tsx` | `ProfileSection` | 个人资料设置 |
| `/app/(dashboard)/dashboard/settings/_components/preferences-section.tsx` | `settings/_components/preferences-section.tsx` | `PreferencesSection` | 偏好设置 |
| `/app/(dashboard)/dashboard/settings/_components/social-accounts-section.tsx` | `settings/_components/social-accounts-section.tsx` | `SocialAccountsSection` | 社交账号绑定 |
| `/app/(dashboard)/dashboard/settings/_components/ai-insight-section.tsx` | `settings/_components/ai-insight-section.tsx` | `AIInsightSection` | AI 洞察功能设置 |
| `/app/(dashboard)/dashboard/settings/_components/billing-section.tsx` | `settings/_components/billing-section.tsx` | `BillingSection` | 账单和订阅管理 |
| `/app/(dashboard)/dashboard/library/images/page.tsx` | `library/images/page.tsx` | `ImageLibraryPage` | 图片库，瀑布流 + Lightbox |
| `/app/(dashboard)/dashboard/library/videos/page.tsx` | `library/videos/page.tsx` | `VideoLibraryPage` | 视频库页面 |
| `/app/(dashboard)/dashboard/tags/[id]/page.tsx` | `app/(dashboard)/dashboard/tags/[id]/page.tsx` | `TagDetailPage` | 单个标签详情页 |
| `/app/pricing/page.tsx` | `app/pricing/page.tsx` | `PricingPage` | 定价方案页面 |
| `/app/pricing/success/page.tsx` | `app/pricing/success/page.tsx` | `PaymentSuccessPage` | 支付成功页 |
| `/app/pricing/cancel/page.tsx` | `app/pricing/cancel/page.tsx` | `PaymentCancelPage` | 支付取消页 |
| `/app/downloads/page.tsx` | `app/downloads/page.tsx` | `DownloadsPage` | 云下载任务管理 |

---

## 🧩 共享业务组件 (Shared Business Components)

| 组件文件 | 组件名称 | 用途 | 关键 Props |
|---------|---------|------|-----------|
| `components/TweetCard.tsx` | `TweetCard` | 推文卡片，展示收藏的推文内容、媒体、标签 | `tweet`, `onDelete`, `onPin`, `onTagChange` |
| `components/TagInput.tsx` | `TagInput` | 标签自动补全输入框 | `tweetId`, `onTagAdded`, `trigger` |
| `components/CloudVideoPlayer.tsx` | `CloudVideoPlayer` | 云存储视频播放器 | `id`, `tweetUrl`, `status`, `metadata` |
| `components/NoteItem.tsx` | `NoteItem` | 快照笔记显示和编辑 | `note`, `isOwner`, `onEdit`, `onDelete` |
| `components/DeleteConfirmDialog.tsx` | `DeleteConfirmDialog` | 通用删除确认对话框 | `isOpen`, `onClose`, `onConfirm`, `isDeleting` |

---

## 📐 布局组件 (Layout Components)

| 组件文件 | 组件名称 | 用途 | 关键 Props |
|---------|---------|------|-----------|
| `components/sidebar.tsx` | `Sidebar` | 主导航侧边栏 | `defaultCollapsed` |
| `components/user-nav.tsx` | `UserNav` | 用户下拉菜单（头像、登出） | 无 |
| `components/StorageIndicator.tsx` | `StorageIndicator` | 存储空间使用量指示器 | `className` |
| `components/layout/page-container.tsx` | `PageContainer` | 页面内容容器，控制最大宽度 | `size`, `className` |
| `components/layout/page-header.tsx` | `PageHeader` | 页面头部，含标题、描述、面包屑 | `title`, `description`, `breadcrumbs`, `actions` |
| `components/layout/section.tsx` | `Section` | 可折叠区块组件 | `title`, `collapsible`, `defaultCollapsed` |

---

## 📊 数据展示组件 (Data Display)

| 组件文件 | 组件名称 | 用途 | 关键 Props |
|---------|---------|------|-----------|
| `components/data-display/data-table.tsx` | `DataTable` | 可排序表格 | `columns`, `data`, `keyField` |
| `components/data-display/metric-card.tsx` | `MetricCard` | 指标卡片，带趋势指示 | `label`, `value`, `trend`, `icon` |
| `components/data-display/list-group.tsx` | `ListGroup` | 带分隔线的列表组 | `children`, `divided` |

---

## 🔄 反馈组件 (Feedback)

| 组件文件 | 组件名称 | 用途 | 关键 Props |
|---------|---------|------|-----------|
| `components/feedback/empty-state.tsx` | `EmptyState` | 空状态提示图 + 操作按钮 | `icon`, `title`, `description`, `action` |
| `components/feedback/error-state.tsx` | `ErrorState` | 错误状态提示 | `title`, `description`, `onRetry` |
| `components/feedback/page-loading.tsx` | `PageLoading` | 页面级加载骨架屏 | 无 |

---

## 📝 表单组件 (Forms)

| 组件文件 | 组件名称 | 用途 | 关键 Props |
|---------|---------|------|-----------|
| `components/forms/form-actions.tsx` | `FormActions` | 表单底部操作按钮组 | `children`, `align` |
| `components/forms/form-field-group.tsx` | `FormFieldGroup` | 表单字段组布局 | `children`, `columns` |
| `components/forms/setting-item.tsx` | `SettingItem` | 设置项单行组件 | `label`, `description`, `children` |
| `components/forms/toggle-setting.tsx` | `ToggleSetting` | 开关式设置项 | `label`, `checked`, `onChange` |

---

## 🎨 基础 UI 组件 (shadcn/ui)

位于 `components/ui/`，包含标准 UI 元素：
- `button`, `input`, `textarea`, `label`, `select`
- `card`, `dialog`, `popover`, `dropdown-menu`, `alert-dialog`
- `avatar`, `badge`, `tooltip`
- `switch`, `checkbox`, `radio-group`
- `progress`, `skeleton`, `separator`
- `command` (用于命令面板/自动补全)
- `tabs` (标签页切换)

---

## 🔗 组件依赖关系

### DashboardPage
```
DashboardPage
├── PageHeader
├── TweetCard (循环渲染)
│   ├── TagInput
│   ├── DeleteConfirmDialog
│   ├── CloudVideoPlayer
│   └── (ui: Button, Badge, Avatar, etc.)
└── (ui: Input, Dialog, etc.)
```

### SettingsPage
```
SettingsPage
├── PageHeader
├── Tabs
└── 各个 Section 组件
    ├── ProfileSection
    ├── PreferencesSection
    ├── SocialAccountsSection
    ├── AIInsightSection
    └── BillingSection
```

### Sidebar
```
Sidebar
├── UserNav
├── StorageIndicator
└── Navigation Links
```

---

## 📝 使用方式示例

- "修改 `TweetCard` 组件的删除按钮样式"
- "在 `SettingsPage` 中添加新的 Tab"
- "更新 `CloudVideoPlayer` 支持倍速播放"
- "调整 `PageHeader` 的面包屑样式"
- "优化 `EmptyState` 的图标显示"

---

*最后更新: 2026-01-06*
