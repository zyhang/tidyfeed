# Project Context: TidyFeed

> **SYSTEM ROLE:** You are a Senior Full-Stack Engineer and Product Architect. This document is the **SINGLE SOURCE OF TRUTH** for the TidyFeed project. Refer to this whenever you plan, write, or refactor code.
> **Last Updated:** 2025-12-30

---

## 1. Product Manifesto

| Field             | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Name**          | TidyFeed                                                                               |
| **Type**          | Chrome Extension + SaaS Web Dashboard + Backend API + Admin Internal Tool              |
| **Mission**       | Filter social media noise, capture valuable content, and turn it into a knowledge base |
| **Target Market** | US/EU (English-first), Knowledge Workers, Researchers                                  |
| **Platforms**     | X (Twitter), with extensibility to Reddit/TikTok                                       |

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  TidyFeed Ecosystem                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐           │
│  │  tidyfeed-       │    │  tidyfeed-       │    │  tidyfeed-       │           │
│  │  extension       │───▶│  backend         │◀───│  web             │           │
│  │  (Browser Ext)   │    │  (API Worker)    │    │  (User Dashboard)│           │
│  └──────────────────┘    └────────┬─────────┘    └──────────────────┘           │
│         │                         │                        ▲                    │
│         ▼                         ▼                        │                    │
│   Chrome/Firefox             Cloudflare              Cloudflare                 │
│   Web Store                  Workers + D1            Pages                      │
│                                   ▲                                             │
│                                   │                                             │
│                          ┌────────┴─────────┐                                   │
│                          │  tidyfeed-       │                                   │
│                          │  admin           │                                   │
│                          │  (Internal Tool) │                                   │
│                          └──────────────────┘                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Breakdown

### 3.1 tidyfeed-extension (Browser Extension)

**Path:** `/tidyfeed-extension`

The primary interface for users to interact with X.com. It handles ad blocking, media downloading, and data capture.

#### Tech Stack

| Component   | Technology                    |
| ----------- | ----------------------------- |
| Framework   | WXT (wxt.dev) v0.20.6         |
| UI          | React 19.x + TailwindCSS 3.4  |
| Bundler     | WXT (built-in Vite)           |
| Language    | TypeScript 5.9                |
| Zip Library | JSZip 3.10                    |
| File Saving | file-saver 2.0                |
| Target      | Chrome, Firefox (Manifest V3) |

#### Features & Highlights
- **Ad Blocker**: DOM-based ad detection/hiding with multi-language support.
- **Media Downloader**: Extracts highest quality video (via Syndication API) and images, zips them with organized metadata.
- **Quote Tweet Support**: Captures context from quoted tweets.
- **AI Smart Filter**: Cloud-synced regex firewall to block unwanted content pattern-matchings.
- **X Internal Block**: Uses user's cookies to invoke native X block API.
- **Login Sync**: Integrates with Google OAuth via web dashboard flow.

---

### 3.2 tidyfeed-backend (API Backend)

**Path:** `/tidyfeed-backend`

The central nervous system handling auth, data storage, and API logic.

#### Tech Stack

| Component     | Technology                    |
| ------------- | ----------------------------- |
| Runtime       | Cloudflare Workers            |
| Framework     | Hono 4.11                     |
| Database      | Cloudflare D1 (SQLite)        |
| Auth          | JWT + Google OAuth + Cookies  |
| Language      | TypeScript 5.5                |
| Testing       | Vitest 3.2                    |

#### Key Capabilities
- **Google OAuth**: Web-application flow handling login and user creation.
- **Resource Management**: CRUD for `saved_posts` and `tags`.
- **Tagging System**: Multi-user tagging system ensuring correct data isolation.
- **Safety**: Secure HttpOnly cookies for session management (SameSite=None for cross-origin).
- **Admin**: Internal reporting APIs.

#### Database Schema (Key Tables)
- `users`: Stores Google ID, profile info.
- `saved_posts`: Bookmarked tweets with JSON-stored media/author metadata.
- `tags`: User-defined tags (unique per user).
- `tweet_tag_refs`: Many-to-many relationship between tweets and tags.
- `admins`: For internal dashboard access.
- `reports`: User-submitted block reports.

---

### 3.3 tidyfeed-web (User Dashboard)

**Path:** `/tidyfeed-web`

The user-facing SaaS dashboard where users view and manage their saved content.

#### Tech Stack

| Component     | Technology                               |
| ------------- | ---------------------------------------- |
| Framework     | Next.js 15.1 (App Router)                |
| UI Library    | Shadcn UI (Radix based)                  |
| Styling       | TailwindCSS 4                            |
| State         | React 19 (Hooks)                         |
| Icons         | Lucide React                             |
| Deployment    | Cloudflare Pages                         |

#### Features
- **Saved Posts Feed**: Masonry/Grid layout of bookmarked tweets.
- **Tagging Interface**: Create, assign, and filter content by tags.
- **Search**: Full-text search over saved content.
- **Auth Flow**: Handles the frontend side of Google OAuth redirect.
- **Visuals**: Modern, responsive design with dark mode support.

---

### 3.4 tidyfeed-admin (Internal Tool)

**Path:** `/tidyfeed-admin`

A restricted-access dashboard for TidyFeed administrators to monitor reports and specific system metrics.

#### Tech Stack
- **Framework**: Next.js 15.1
- **Deployment**: Cloudflare Pages
- **Auth**: Separate Admin Table (Email/Password)

---

## 4. Key Workflows

### 4.1 Authentication (Google OAuth)
1. User clicks "Login" in Extension Popup or Web Dashboard.
2. Redirects to `<API_URL>/auth/login/google`.
3. User consents on Google.
4. Google callback to `<API_URL>/auth/callback/google`.
5. Backend verifies ID Token, updates `users` table, generates JWT.
6. Backend sets `auth_token` as **HttpOnly, Secure, SameSite=None** cookie.
7. Redirects user to Dashboard (`https://a.tidyfeed.app/dashboard`).
8. Extension detects cookie availability for API calls.

### 4.2 Save & Tag Post
1. User clicks "Save" (future feature) or "Download" in Extension.
2. Extension sends tweet data to Backend (`POST /api/posts`).
3. User views post in **tidyfeed-web Dashboard**.
4. User adds tag "Tech".
5. Frontend calls `POST /api/tweets/tag`.
6. Backend upserts tag "Tech" for that user and links it to the tweet.
7. UI updates optimistically to show the new tag.

---

## 5. Development & Deployment

### Environment Variables
Shared across projects (configured via `.env` or Wrangler secrets):
- `NEXT_PUBLIC_API_URL`: Backend API URL (e.g., `https://api.tidyfeed.app`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For OAuth.
- `JWT_SECRET`: For session signing.

### Commands
- **Extension**: `npm run dev` (WXT)
- **Backend**: `npm run dev` (Wrangler)
- **Web/Admin**: `npm run dev` (Next.js)

### Production URLs
- **Backend**: `https://api.tidyfeed.app`
- **Web Dashboard**: `https://a.tidyfeed.app` (or similar Cloudflare Pages URL)
- **Landing Page**: `https://tidyfeed.app`

---

## 6. Roadmap Status

### Completed ✅
- [x] Extension: Ad Blocker & Media Downloader
- [x] Extension: Quote Tweet & Video Support
- [x] Extension: AI Regex Filter
- [x] Backend: Hono + D1 Infrastructure
- [x] Backend: Google OAuth Implementation
- [x] Backend: Tagging System (Schema + APIs)
- [x] Web: User Dashboard with Saved Posts
- [x] Web: Tagging UI & Integration
- [x] Admin: Internal Reporting Dashboard

### In Progress 🔄
- [ ] Extension: "Save to TidyFeed" button direct integration
- [ ] Web: Advanced Filtering & Search
- [ ] Web: Settings Page

### Planned 📋
- [ ] AI Summary of saved threads
- [ ] Cross-browser sync via Extension storage -> Cloud
- [ ] Mobile App / PWA optimizations
