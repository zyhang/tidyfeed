# TidyFeed - 项目文档导航

> **最后更新**: 2026-01-03

## 📚 核心产品文档

### 1. **产品规范** - [AI_PRODUCT_SPEC.md](AI_PRODUCT_SPEC.md)
完整的产品需求文档、系统架构概览、API说明。

### 2. **详细架构** - [ARCHITECTURE_DETAILED.md](ARCHITECTURE_DETAILED.md)
多浏览器架构设计、构建和部署流程、技术栈详解。

---

## 🦊 Firefox 插件文档

所有Firefox相关文档已归档到扩展项目中：
→ **[tidyfeed-extension/docs/firefox/](tidyfeed-extension/docs/firefox/)**

包括：
- Firefox完整路线图 (`FIREFOX_COMPLETE_ROADMAP.md`)
- Firefox交付清单 (`FIREFOX_DELIVERY_CHECKLIST.md`)
- Firefox文档索引 (`FIREFOX_DOCUMENTATION_INDEX.md`)
- Firefox实现完整指南 (`FIREFOX_IMPLEMENTATION_COMPLETE.md`)
- Firefox迁移计划 (`FIREFOX_MIGRATION_PLAN.md`)
- Firefox快速开始 (`FIREFOX_QUICK_START.md`)
- Firefox支持文档 (`FIREFOX_SUPPORT_README.md`)
- Firefox项目总结 (`FIREFOX_PROJECT_SUMMARY.txt`)

---

## 🏗️ 项目结构

### 浏览器扩展
- **tidyfeed-extension** - 主扩展项目（Chrome + Firefox）
  - 支持 Firefox 和 Chrome 多浏览器构建
  - 使用 WXT 框架
  - [扩展项目 README](tidyfeed-extension/README.md)

### 后端服务
- **tidyfeed-backend** - API 服务和数据库
- **tidyfeed-bot-worker** - Python Bot Worker
- **tidyfeed-python-worker** - Python Worker

### 前端应用
- **tidyfeed-web** - 主要 Web 应用
- **tidyfeed-admin** - 管理后台

---

## 🚀 快速开始

详见各组件的 README 文件：
- 扩展开发: [tidyfeed-extension/README.md](tidyfeed-extension/README.md)
- 后端开发: [tidyfeed-backend/README.md](tidyfeed-backend/README.md)
- Web应用: [tidyfeed-web/README.md](tidyfeed-web/README.md)
- 管理后台: [tidyfeed-admin/README.md](tidyfeed-admin/README.md)
