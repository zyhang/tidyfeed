# Project Context: TidyFeed

> **SYSTEM ROLE:** You are a Senior Full-Stack Engineer and Product Architect. This document is the **SINGLE SOURCE OF TRUTH** for the TidyFeed project. Refer to this whenever you plan, write, or refactor code.
> **Last Updated:** 2026-01-02

---

## 1. Product Manifesto

| Field             | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Name**          | TidyFeed                                                                               |
| **Type**          | Chrome Extension + SaaS Web Dashboard + Backend API + Internal Workers + Admin Tool   |
| **Mission**       | Filter social media noise, capture valuable content, and turn it into a knowledge base |
| **Target Market** | US/EU (English-first), Knowledge Workers, Researchers                                  |
| **Platforms**     | X (Twitter), with extensibility to Reddit/TikTok                                       |

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  TidyFeed Ecosystem                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                   │
│  │  tidyfeed-       │    │  tidyfeed-       │    │  tidyfeed-       │                   │
│  │  extension       │───▶│  backend         │◀───│  web             │                   │
│  │  (Browser Ext)   │    │  (API Worker)    │    │  (User Dashboard)│                   │
│  └──────────────────┘    └────────┬─────────┘    └──────────────────┘                   │
│         │                         │                        ▲                            │
│         ▼                         ▼                        │                            │
│   Chrome/Firefox        ┌────────────────────┐       Cloudflare Pages                   │
│   Web Store             │   Cloudflare D1    │                                          │
│                         │   Cloudflare R2    │                                          │
│                         └────────┬───────────┘                                          │
│                                  │                                                      │
│    ┌─────────────────────────────┼─────────────────────────────┐                        │
│    │                             │                             │                        │
│    ▼                             ▼                             ▼                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                   │
│  │  tidyfeed-       │    │  tidyfeed-       │    │  tidyfeed-       │                   │
│  │  bot-worker      │    │  python-worker   │    │  admin           │                   │
│  │  (Twitter Bot)   │    │  (Video DL)      │    │  (Internal Tool) │                   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘                   │
│         │                         │                                                     │
│         ▼                         ▼                                                     │
│      Fly.io                    Fly.io                                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
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
- **Hybrid Ad/Spam Blocker**: Combines traditional DOM hiding with a sophisticated **Scoring Engine** to detect crypto spam and low-quality content.
- **AI Scoring Firewall**: JSON-based rule system (v2) with weighted scoring, thresholds, and cloud-synced pattern updates (`regex_rules.json`).
- **Native UI Integration**: Injects **"Keep" (Bookmark)**, **"Download"**, and **"Block"** buttons directly into Tweet action bars (Timeline & Detail pages).
- **Media Downloader**: Extracts highest quality video/images (including from Quote Tweets), packages them in ZIP with structured metadata.
- **Cloud Video Download**: Queue server-side video downloads via `yt-dlp`, stored in Cloudflare R2.
- **X Internal Block**: Uses user's cookies to invoke native X block API + TidyFeed reporting.
- **Social Account Linking**: Auto-detects and links user's X identity to TidyFeed account (enables @tidyfeedapp bot).
- **Saved Posts Sync**: Background sync of saved post IDs from cloud to local storage.
- **Global Ready**: Multi-language tooltip support (EN, ZH, JA, ES).
- **Login Sync**: Integrates with Google OAuth via web dashboard flow.

---

### 3.2 tidyfeed-backend (API Backend)

**Path:** `/tidyfeed-backend`

The central nervous system handling auth, data storage, and API logic.

#### Tech Stack

| Component     | Technology                             |
| ------------- | -------------------------------------- |
| Runtime       | Cloudflare Workers                     |
| Framework     | Hono 4.11                              |
| Database      | Cloudflare D1 (SQLite)                 |
| Storage       | Cloudflare R2 (for video files)        |
| Auth          | JWT + Google OAuth + Cookies           |
| Language      | TypeScript 5.5                         |
| Testing       | Vitest 3.2                             |

#### Key Capabilities
- **Google OAuth**: Web-application flow handling login and user creation.
- **Resource Management**: CRUD for `saved_posts` and `tags`.
- **Tagging System**: Multi-user tagging system ensuring correct data isolation.
- **Cloud Video Downloader**: Task queue for video downloads, R2 storage, usage tracking.
- **Social Account Linking**: Links X/Twitter accounts to TidyFeed users for bot functionality.
- **Storage Quota**: Tracks per-user storage usage for video downloads.
- **Internal Service APIs**: Protected endpoints for bot-worker and python-worker.
- **Safety**: Secure HttpOnly cookies for session management (SameSite=None for cross-origin).
- **Admin**: Internal reporting APIs.

#### Database Schema (Key Tables)
- `users`: Google ID, profile info, `storage_usage` tracking.
- `saved_posts`: Bookmarked tweets with JSON-stored media/author metadata, `pinned_at` for pinning.
- `tags`: User-defined tags (unique per user).
- `post_tags`: Many-to-many relationship between posts and tags.
- `social_accounts`: Linked social platform accounts (X, etc.) per user.
- `video_downloads`: Cloud video download tasks with status, R2 keys, metadata.
- `bot_processed_mentions`: Deduplication table for @tidyfeedapp mentions.
- `admins`: For internal dashboard access.
- `reports`: User-submitted block reports.

#### Route Modules
- `src/routes/downloads.ts`: Cloud video downloader user & internal endpoints.
- `src/routes/internal.ts`: Internal service APIs (bot-save, health check).

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
- **Pinned Posts**: Pin important posts to top of feed.
- **Tagging Interface**: Create, assign, and filter content by tags.
- **Search**: Full-text search over saved content.
- **Downloads Page**: View cloud-downloaded videos, storage usage.
- **Settings Page**: User preferences and account management.
- **Auth Flow**: Handles the frontend side of Google OAuth redirect.
- **Privacy & Terms**: Static legal pages.
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

### 3.5 tidyfeed-bot-worker (Twitter Mention Bot)

**Path:** `/tidyfeed-bot-worker`

A Python-based Twitter bot that monitors mentions of @tidyfeedapp and saves tweets on behalf of users.

#### Tech Stack

| Component     | Technology                    |
| ------------- | ----------------------------- |
| Language      | Python 3.11+                  |
| Twitter API   | twikit (unofficial client)    |
| HTTP Client   | requests                      |
| Deployment    | Fly.io (Docker container)     |

#### Features & Highlights
- **Mention Polling**: Monitors @tidyfeedapp mentions using twikit's notification API.
- **Trigger Word Detection**: Responds to keywords: `save`, `keep`, `收藏`, `保存`, `tidy`, `bookmark`.
- **Reply Processing**: When a user replies to a tweet with a trigger word while mentioning @tidyfeedapp, saves the **parent tweet** to user's TidyFeed account.
- **User Lookup**: Matches Twitter handle to TidyFeed user via `social_accounts` table.
- **Tweet Detail Extraction**: Fetches full tweet content, media URLs, author info.
- **Like Acknowledgment**: Likes the mention tweet to acknowledge successful save.
- **Rate Limit Aware**: Randomized polling intervals (45-90s), error backoff (5 min).
- **Database Deduplication**: Uses `bot_processed_mentions` table to avoid duplicate processing.
- **Cookie-based Auth**: Uses pre-authenticated cookies file for Twitter access.

#### Configuration (Environment Variables)
- `API_BASE_URL`: Backend API URL.
- `INTERNAL_SERVICE_KEY`: Service-to-service auth key.
- `BOT_USERNAME`: Twitter bot account username.
- `BOT_COOKIES_PATH`: Path to cookies.json file.
- `POLL_MIN_SECONDS` / `POLL_MAX_SECONDS`: Polling interval range.

---

### 3.6 tidyfeed-python-worker (Cloud Video Downloader)

**Path:** `/tidyfeed-python-worker`

A Python worker that processes video download tasks queued by the extension.

#### Tech Stack

| Component     | Technology                    |
| ------------- | ----------------------------- |
| Language      | Python 3.11+                  |
| Video DL      | yt-dlp                        |
| Cloud Storage | boto3 (S3-compatible for R2)  |
| HTTP Client   | requests                      |
| Deployment    | Fly.io (Docker container)     |

#### Features & Highlights
- **Task Queue Polling**: Fetches pending tasks from `GET /api/downloads/internal/next-task`.
- **Secure Cookie Escrow**: Temporarily receives user's Twitter cookies, wipes after download completes.
- **yt-dlp Integration**: Downloads best quality video/audio, merges to MP4.
- **R2 Upload**: Uploads completed videos to Cloudflare R2 bucket.
- **Metadata Extraction**: Captures video title, duration, source URL.
- **Task Completion**: Reports success/failure via `POST /api/downloads/internal/complete`.
- **Cookie Security**: Cookies are deleted from database immediately after task completion.
- **File Size Tracking**: Reports file size for storage quota management.

#### Configuration (Environment Variables)
- `API_BASE_URL`: Backend API URL.
- `INTERNAL_SERVICE_KEY`: Service-to-service auth key.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: R2 credentials.
- `R2_BUCKET_NAME`: R2 bucket name (default: `tidyfeed-media`).
- `POLL_INTERVAL`: Task polling interval in seconds.

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
1. User clicks **"Keep" (Bookmark)** or "Download" in Extension.
2. Extension sends tweet data to Backend (`POST /api/posts`).
3. User views post in **tidyfeed-web Dashboard**.
4. User adds tag "Tech".
5. Frontend calls `POST /api/tweets/tag`.
6. Backend upserts tag "Tech" for that user and links it to the tweet.
7. UI updates optimistically to show the new tag.

### 4.3 Twitter Bot Save (via @tidyfeedapp Mention)
1. User sees a tweet they want to save.
2. User replies to the tweet: `@tidyfeedapp save`.
3. **tidyfeed-bot-worker** polls notifications and detects the mention.
4. Bot checks if the reply contains a trigger word (`save`, `keep`, etc.).
5. Bot fetches the **parent tweet** (the one being replied to).
6. Bot calls `POST /api/internal/bot-save` with user handle and tweet data.
7. Backend looks up user by X handle in `social_accounts` table.
8. Backend saves tweet to user's `saved_posts`.
9. Bot likes the mention to acknowledge success.

### 4.4 Cloud Video Download
1. User clicks "Cloud Download" button on a tweet in the extension.
2. Extension captures user's Twitter cookies and tweet URL.
3. Extension calls `POST /api/downloads/queue` with cookies and URL.
4. Backend creates task in `video_downloads` table (status: `pending`).
5. **tidyfeed-python-worker** polls for pending tasks.
6. Worker downloads video using yt-dlp with user's cookies.
7. Worker uploads video to Cloudflare R2.
8. Worker calls completion API, which:
   - Updates task status to `completed`.
   - Stores R2 key and metadata.
   - **Wipes cookies from database**.
   - Updates user's `storage_usage`.
9. User can view/stream video from Dashboard or extension.

### 4.5 Social Account Linking
1. User logs into TidyFeed (Google OAuth).
2. User browses X.com with extension installed.
3. Extension detects user's X identity via `window.__INITIAL_STATE__` or verify_credentials API.
4. Extension calls `POST /api/auth/link-social` with X account info.
5. Backend upserts record in `social_accounts` table.
6. User can now use @tidyfeedapp mention saving feature.

---

## 5. Development & Deployment

### Environment Variables

**Backend (Cloudflare Worker Secrets):**
- `JWT_SECRET`: For session signing.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For OAuth.
- `INTERNAL_SERVICE_KEY`: For worker-to-backend auth.

**Web/Admin:**
- `NEXT_PUBLIC_API_URL`: Backend API URL (e.g., `https://api.tidyfeed.app`).

**Bot Worker (Fly.io Secrets):**
- `API_BASE_URL`, `INTERNAL_SERVICE_KEY`, `BOT_USERNAME`, `BOT_COOKIES_PATH`.

**Python Worker (Fly.io Secrets):**
- `API_BASE_URL`, `INTERNAL_SERVICE_KEY`, `R2_*` credentials.

### Commands
- **Extension**: `npm run dev` (WXT)
- **Backend**: `npm run dev` (Wrangler)
- **Web/Admin**: `npm run dev` (Next.js)
- **Bot Worker**: `python bot.py` (local) or `fly deploy` (production)
- **Python Worker**: `python worker.py` (local) or `fly deploy` (production)

### Production URLs
- **Backend**: `https://api.tidyfeed.app`
- **Web Dashboard**: `https://a.tidyfeed.app`
- **Landing Page**: `https://tidyfeed.app`
- **Bot Worker**: Fly.io (tidyfeed-bot-worker.fly.dev)
- **Video Worker**: Fly.io (tidyfeed-python-worker.fly.dev)

---

## 6. Roadmap Status

### Completed ✅
- [x] Extension: Ad Blocker & Media Downloader
- [x] Extension: Quote Tweet & Video Support
- [x] Extension: AI Scoring Engine & v2 Config
- [x] Extension: Native Action Bar Injection (Timeline + Detail Page)
- [x] Extension: "Save to TidyFeed" (Keep) Button
- [x] Extension: Multi-language Support (i18n)
- [x] Extension: Cloud Video Download Queue
- [x] Extension: Social Account Auto-linking
- [x] Extension: Saved Posts ID Sync
- [x] Backend: Hono + D1 Infrastructure
- [x] Backend: Google OAuth Implementation
- [x] Backend: Tagging System (Schema + APIs)
- [x] Backend: Cloud Video Download APIs (queue, status, media)
- [x] Backend: Social Account Linking APIs
- [x] Backend: Storage Quota Tracking
- [x] Backend: Internal Service APIs (bot-save)
- [x] Bot Worker: Twitter Mention Monitoring (@tidyfeedapp)
- [x] Bot Worker: Trigger Word Detection & Reply Parsing
- [x] Bot Worker: Database-based Deduplication
- [x] Python Worker: yt-dlp Video Download
- [x] Python Worker: R2 Upload & Metadata
- [x] Python Worker: Secure Cookie Handling (wipe after use)
- [x] Web: User Dashboard with Saved Posts
- [x] Web: Tagging UI & Integration
- [x] Web: Pinned Posts Support
- [x] Web: Downloads Page
- [x] Web: Privacy & Terms Pages
- [x] Admin: Internal Reporting Dashboard

### In Progress 🔄
- [ ] Web: Settings Page (expanded)
- [ ] Web: Advanced Filtering & Search

### Planned 📋
- [ ] AI Summary of saved threads
- [ ] Cross-browser sync via Extension storage -> Cloud
- [ ] Mobile App / PWA optimizations
- [ ] Bot: Reply with confirmation message
