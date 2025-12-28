# Project Context: TidyFeed

> **SYSTEM ROLE:** You are a Senior Full-Stack Engineer and Product Architect. This document is the **SINGLE SOURCE OF TRUTH** for the TidyFeed project. Refer to this whenever you plan, write, or refactor code.
> **Last Updated:** 2025-12-28

---

## 1. Product Manifesto

| Field             | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Name**          | TidyFeed                                                                               |
| **Type**          | Chrome Extension (Manifest V3) + SaaS Web Dashboard + Backend API                      |
| **Mission**       | Filter social media noise, capture valuable content, and turn it into a knowledge base |
| **Target Market** | US/EU (English-first), Knowledge Workers, Researchers                                  |
| **Platforms**     | X (Twitter), with extensibility to Reddit/TikTok                                       |

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TidyFeed Ecosystem                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  tidyfeed-       │    │  tidyfeed-       │    │  tidyfeed-       │       │
│  │  extension       │───▶│  backend         │◀───│  admin           │       │
│  │  (Browser Ext)   │    │  (API Worker)    │    │  (Dashboard)     │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│         │                         │                       │                 │
│         ▼                         ▼                       ▼                 │
│   Chrome/Firefox             Cloudflare              Cloudflare             │
│   Web Store                  Workers + D1            Pages                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Breakdown

### 3.1 tidyfeed-extension (Browser Extension)

**Path:** `/tidyfeed-extension`

#### Tech Stack

| Component   | Technology                    |
| ----------- | ----------------------------- |
| Framework   | WXT (wxt.dev) v0.20.6         |
| UI          | React 19 + TailwindCSS 3.4    |
| Bundler     | WXT (built-in Vite)           |
| Language    | TypeScript 5.9                |
| Zip Library | JSZip 3.10                    |
| File Saving | file-saver 2.0                |
| Target      | Chrome, Firefox (Manifest V3) |

#### Permissions Required

```json
{
  "permissions": ["storage", "activeTab", "scripting", "alarms", "cookies"],
  "host_permissions": [
    "*://*.x.com/*",
    "*://*.twitter.com/*",
    "*://cdn.syndication.twimg.com/*",
    "*://video.twimg.com/*",
    "*://pbs.twimg.com/*",
    "https://tidyfeed.app/*",
    "https://api.tidyfeed.app/*"
  ]
}
```

#### Directory Structure

```
tidyfeed-extension/
├── entrypoints/
│   ├── background.ts          # Service worker: video extraction, API calls, X blocking
│   ├── content.tsx            # Entry point for content scripts
│   ├── content/
│   │   ├── components/        # React UI components for injection
│   │   ├── hooks/             # Custom React hooks
│   │   └── logic/
│   │       ├── adBlocker.ts   # Ad detection & tweet collapsing
│   │       ├── injector.ts    # Button injection & ZIP download
│   │       ├── reactExtractor.ts # React props data extraction
│   │       ├── reporter.ts    # Cloud report submission
│   │       └── config.ts      # Configuration constants
│   └── popup/
│       ├── App.tsx            # Popup UI (stats, toggles, keywords)
│       ├── index.html         # Popup HTML entry
│       └── useStorageValue.ts # Storage hook for popup
├── assets/
│   └── tailwind.css           # TailwindCSS styles
├── public/                    # Static assets (icons)
├── wxt.config.ts              # WXT configuration
├── tailwind.config.js         # TailwindCSS config
├── tsconfig.json              # TypeScript config
└── package.json
```

#### Core Features

| Feature              | Status | Description                                                                                                    |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| **Ad Blocker**       | ✅      | Detects promoted tweets via DOM analysis, collapses them with fold bar, multi-language support (EN/CN/JP/etc) |
| **Keyword Filter**   | ✅      | User-defined keyword blocklist stored in `chrome.storage.local`                                                |
| **AI Regex Filter**  | ✅      | Cloud-synced regex rules from `https://tidyfeed.app/regex_rules.json`, auto-refreshed every 24h                |
| **Media Downloader** | ✅      | Downloads tweet text/images/videos as ZIP with structured folders (`main/`, `quote/`)                          |
| **Video Extraction** | ✅      | Uses Twitter Syndication API + React props fallback to get highest quality MP4                                 |
| **Quote Tweet**      | ✅      | Full support for extracting data/media from quoted tweets                                                      |
| **X Block API**      | ✅      | Uses user's cookies (ct0 CSRF token) to call X's internal `blocks/create.json` API                             |
| **Cloud Report**     | ✅      | Reports blocked users to TidyFeed backend for aggregation                                                      |

#### Key Background Script Messages

| Message Type         | Direction      | Purpose                                  |
| -------------------- | -------------- | ---------------------------------------- |
| `EXTRACT_VIDEO_URL`  | Content → BG   | Request video URL from Syndication API   |
| `FETCH_TWEET_DATA`   | Content → BG   | Fetch tweet text/author from API         |
| `REPORT_BLOCK`       | Content → BG   | Submit block report to cloud backend     |
| `BLOCK_USER`         | Content → BG   | Perform native X block via internal API  |
| `FORCE_REGEX_SYNC`   | Popup/UI → BG  | Force refresh cloud regex rules          |

#### Storage Keys

| Key                      | Type       | Description                       |
| ------------------------ | ---------- | --------------------------------- |
| `stats_ads_blocked`      | number     | Counter for blocked items         |
| `user_blocked_keywords`  | string[]   | User-defined blocked keywords     |
| `enable_regex_filter`    | boolean    | Toggle for AI smart filter        |
| `cloud_regex_list`       | string[]   | Synced regex patterns from cloud  |
| `regex_last_updated`     | number     | Timestamp of last regex sync      |
| `tidyfeed_uid`           | string     | Unique user ID (UUID v4)          |
| `user_type`              | 'guest' \| 'google' | User authentication type |

---

### 3.2 tidyfeed-backend (API Backend)

**Path:** `/tidyfeed-backend`

#### Tech Stack

| Component     | Technology                    |
| ------------- | ----------------------------- |
| Runtime       | Cloudflare Workers            |
| Framework     | Hono 4.11                     |
| Database      | Cloudflare D1 (SQLite)        |
| Auth          | JWT (hono/jwt) + bcryptjs     |
| Language      | TypeScript 5.5                |
| Testing       | Vitest 3.2                    |

#### Environment/Bindings

```typescript
type Bindings = {
  DB: D1Database;      // Cloudflare D1 database
  JWT_SECRET: string;  // Secret for JWT signing (7-day expiry)
};
```

#### Directory Structure

```
tidyfeed-backend/
├── src/
│   └── index.ts           # Main Hono app with all routes
├── test/                  # Vitest test files
├── schema.sql             # Database schema (admins, reports tables)
├── wrangler.jsonc         # Cloudflare Workers config
├── BACKEND_SPEC.md        # API documentation
├── tsconfig.json
└── package.json
```

#### Database Schema

```sql
-- Admins table (for dashboard login)
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL  -- bcrypt hashed
);

-- Reports table (user block reports)
CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id TEXT NOT NULL,           -- Extension's tidyfeed_uid
    reporter_type TEXT NOT NULL,         -- 'guest' or 'google'
    blocked_x_id TEXT NOT NULL,          -- X user ID being reported
    blocked_x_name TEXT,                 -- X username/handle
    reason TEXT,                         -- Report reason
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reporter_id, blocked_x_id)   -- Prevent duplicate reports
);
```

#### API Endpoints

| Endpoint           | Method | Auth        | Description                            |
| ------------------ | ------ | ----------- | -------------------------------------- |
| `/`                | GET    | ❌ None      | Health check                           |
| `/auth/login`      | POST   | ❌ None      | Admin login (returns JWT)              |
| `/api/report`      | POST   | Header-based| Submit user block report               |
| `/api/reports`     | GET    | JWT Bearer  | Get aggregated reports (admin)         |
| `/api/reports/all` | GET    | JWT Bearer  | Get all individual reports (admin)     |

#### Authentication Methods

1. **Public API (Extension):**
   - `X-User-Id`: Unique user identifier (`tidyfeed_uid`)
   - `X-User-Type`: `guest` or `google`

2. **Admin API (Dashboard):**
   - `Authorization: Bearer <jwt_token>`
   - JWT expires in 7 days

#### Deployment

```bash
npm run dev     # Local development with wrangler
npm run deploy  # Deploy to Cloudflare Workers
```

**Production URL:** `https://api.tidyfeed.app` (via Cloudflare Workers)

---

### 3.3 tidyfeed-admin (Admin Dashboard)

**Path:** `/tidyfeed-admin`

#### Tech Stack

| Component     | Technology                               |
| ------------- | ---------------------------------------- |
| Framework     | Next.js 15.1 (App Router)                |
| React         | React 19                                 |
| UI Library    | Shadcn UI (Radix primitives)             |
| Styling       | TailwindCSS 4 + tw-animate-css           |
| Toast         | Sonner 2.0                               |
| Theme         | next-themes 0.4 (dark mode support)      |
| Icons         | Lucide React                             |
| Language      | TypeScript 5                             |
| Hosting       | Cloudflare Pages                         |

#### Directory Structure

```
tidyfeed-admin/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Login page (root route)
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Protected dashboard with reports table
│   │   ├── layout.tsx         # Root layout with Sonner provider
│   │   └── globals.css        # Global styles + Shadcn CSS variables
│   ├── components/
│   │   └── ui/                # Shadcn UI components (Button, Card, Input, Table, etc.)
│   └── lib/
│       ├── config.ts          # API_BASE_URL constant
│       ├── auth.ts            # Token/email storage helpers
│       └── utils.ts           # cn() utility for className merging
├── public/                    # Static assets
├── wrangler.toml              # Cloudflare Pages config
├── next.config.ts             # Next.js config
├── components.json            # Shadcn UI config
├── tsconfig.json
└── package.json
```

#### Pages & Features

| Page         | Route         | Features                                                   |
| ------------ | ------------- | ---------------------------------------------------------- |
| Login        | `/`           | Email/password login, calls `/auth/login`, stores JWT      |
| Dashboard    | `/dashboard`  | Protected route, displays aggregated reports table         |

#### Dashboard Features

- **Auth Protection:** Redirects to login if no valid token
- **Reports Table:** Shows blocked X accounts with:
  - Username & ID
  - Report count badge
  - Combined reasons
  - Latest report timestamp
- **Session Management:** Logout clears auth, token expiry redirects to login
- **Refresh:** Manual refresh button for reports data

#### Client-Side Auth Storage

```typescript
// Stored in localStorage
{
  tidyfeed_admin_token: string;  // JWT token
  tidyfeed_admin_email: string;  // Admin email
}
```

#### Deployment

```bash
npm run dev         # Local Next.js dev server
npm run build       # Build for production
npm run pages:build # Build for Cloudflare Pages
```

**Production URL:** Deployed via Cloudflare Pages

---

## 4. Data Flow Diagrams

### 4.1 Block & Report Flow

```
User clicks "Block" on tweet
        │
        ▼
┌───────────────────────────────────────┐
│ content/logic/injector.ts             │
│ handleBlockClick()                    │
└───────────────────────────────────────┘
        │
        ├───▶ Message: BLOCK_USER (userId) ───▶ background.ts
        │                                        │
        │                                        ▼
        │                              ┌─────────────────────────────┐
        │                              │ performBlockOnX()           │
        │                              │ - Get ct0 cookie (CSRF)     │
        │                              │ - POST to blocks/create.json│
        │                              └─────────────────────────────┘
        │
        └───▶ Message: REPORT_BLOCK ───────▶ background.ts
                                              │
                                              ▼
                                    ┌─────────────────────────────┐
                                    │ handleReportBlock()         │
                                    │ POST to /api/report         │
                                    │ Headers: X-User-Id, X-User- │
                                    └─────────────────────────────┘
                                              │
                                              ▼
                                       TidyFeed Backend
                                    (api.tidyfeed.app)
                                              │
                                              ▼
                                         D1 Database
```

### 4.2 Video Download Flow

```
User clicks "Download" on tweet
        │
        ▼
┌───────────────────────────────────────┐
│ content/logic/injector.ts             │
│ handleDownloadClick()                 │
│ - Extract tweet data from DOM         │
│ - Extract images from DOM             │
└───────────────────────────────────────┘
        │
        │ (If video detected)
        ▼
┌───────────────────────────────────────┐
│ Message: EXTRACT_VIDEO_URL (tweetId)  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ background.ts                         │
│ handleVideoExtraction()               │
│ 1. Try Syndication API first          │
│ 2. Fallback to React props injection  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ JSZip creation:                       │
│ ├── main/                             │
│ │   ├── {handle}_{id}_img_1.jpg       │
│ │   └── {handle}_{id}_video_1.mp4     │
│ ├── quote/ (if exists)                │
│ │   └── {handle}_{id}_img_1.jpg       │
│ └── content.md (tweet text)           │
└───────────────────────────────────────┘
        │
        ▼
   file-saver → downloads ZIP
```

---

## 5. Coding Guidelines

### General Rules

1. **TypeScript Strict:** Always use TypeScript interfaces. No `any` unless absolutely necessary.
2. **Component Modularity:** Small, reusable components. Shadcn components in `/components/ui`.
3. **Error Handling:**
   - Extension: Fail silently on DOM errors, log to console. Never crash the page.
   - Dashboard: Show toast notifications for API errors.
4. **Privacy First:** Never log user content or API keys to server logs.

### Extension-Specific

- Use WXT patterns for entrypoints
- Use `browser.*` API (WXT polyfills for cross-browser)
- All DOM selectors should handle Twitter/X layout changes gracefully
- Background script messages must always return promises

### Backend-Specific

- Use Hono middleware pattern for auth
- All endpoints return JSON with `error` key on failure
- CORS enabled for all origins

### Admin-Specific

- Use Next.js App Router conventions
- All pages are client components (`'use client'`)
- Use Shadcn UI for all form elements

---

## 6. Environment Variables

### Backend (wrangler.jsonc)

```jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "tidyfeed-db",
    "database_id": "<your-d1-database-id>"
  }],
  "vars": {
    "JWT_SECRET": "<your-jwt-secret>"  // Use wrangler secret for production
  }
}
```

### Admin Dashboard

```typescript
// src/lib/config.ts
export const API_BASE_URL = 'https://api.tidyfeed.app';
```

### Extension

```typescript
// entrypoints/background.ts
const BACKEND_URL = 'https://api.tidyfeed.app';
const REMOTE_REGEX_URL = 'https://tidyfeed.app/regex_rules.json';
```

---

## 7. Development Commands

### Extension

```bash
cd tidyfeed-extension
npm install
npm run dev           # Start dev mode (Chrome)
npm run dev:firefox   # Start dev mode (Firefox)
npm run build         # Production build
npm run zip           # Create extension ZIP for store upload
```

### Backend

```bash
cd tidyfeed-backend
npm install
npm run dev           # Start local Wrangler dev server
npm run deploy        # Deploy to Cloudflare Workers
npm test              # Run Vitest tests
```

### Admin Dashboard

```bash
cd tidyfeed-admin
npm install
npm run dev           # Start Next.js dev server
npm run build         # Build for production
npm run pages:build   # Build for Cloudflare Pages
```

---

## 8. Deployment Targets

| Project          | Platform            | URL                              |
| ---------------- | ------------------- | -------------------------------- |
| tidyfeed-backend | Cloudflare Workers  | `https://api.tidyfeed.app`       |
| tidyfeed-admin   | Cloudflare Pages    | TBD (Cloudflare Pages URL)       |
| tidyfeed-extension| Chrome Web Store   | TBD (Chrome Extension ID)        |
| Landing Page     | `tidyfeed.app`      | `https://tidyfeed.app`           |

---

## 9. Roadmap Status

### Completed ✅

- [x] WXT + TailwindCSS + Manifest V3 setup
- [x] Ad Hiding on X.com (DOM injection with fold bar)
- [x] Download Media button (images + text)
- [x] Video Download (Syndication API + React props fallback)
- [x] Quote Tweet Support (media + text + video)
- [x] Cloud-synced Regex Firewall (AI Smart Filter)
- [x] User-defined Keyword Filter
- [x] Backend API (Hono + D1)
- [x] Admin Dashboard (Next.js + Shadcn)
- [x] X Internal Block API integration
- [x] Cloud report submission

### In Progress 🔄

- [ ] Google OAuth for user authentication
- [ ] DeepSeek API integration for summarization

### Planned 📋

- [ ] AI Second Brain Dashboard (saved clips + AI analysis)
- [ ] Cross-device sync via Supabase
- [ ] Reddit/TikTok platform support

---

## 10. Quick Reference Links

| Resource          | Path/URL                                           |
| ----------------- | -------------------------------------------------- |
| Backend API Spec  | `/tidyfeed-backend/BACKEND_SPEC.md`                |
| Extension Config  | `/tidyfeed-extension/wxt.config.ts`                |
| Database Schema   | `/tidyfeed-backend/schema.sql`                     |
| UI Components     | `/tidyfeed-admin/src/components/ui/`               |
| Content Scripts   | `/tidyfeed-extension/entrypoints/content/logic/`   |
| Background Script | `/tidyfeed-extension/entrypoints/background.ts`    |
