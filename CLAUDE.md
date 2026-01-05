# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TidyFeed is a multi-service social media management platform for filtering noise and capturing valuable content from X.com (Twitter). The system consists of 6 independent services that share a Cloudflare D1 database and R2 storage.

**Services:**
- `tidyfeed-extension/` - Browser extension (Chrome + Firefox) using WXT + React 19
- `tidyfeed-backend/` - Cloudflare Worker API using Hono + D1 + R2
- `tidyfeed-web/` - User dashboard (Next.js 15 + Shadcn UI)
- `tidyfeed-admin/` - Internal admin dashboard (Next.js 15)
- `tidyfeed-bot-worker/` - Twitter mention bot (Python, deployed to Fly.io)
- `tidyfeed-python-worker/` - Video download worker (Python + yt-dlp, deployed to Fly.io)

**Production URLs:**
- API: https://api.tidyfeed.app
- Dashboard: https://a.tidyfeed.app
- Landing: https://tidyfeed.app

## Development Commands

### Extension (tidyfeed-extension/)
```bash
npm run dev              # Development build for Chrome
npm run dev:firefox      # Development build for Firefox
npm run build            # Production build for Chrome
npm run build:firefox    # Production build for Firefox
npm run zip              # Create distributable ZIP for Chrome
npm run zip:firefox      # Create distributable ZIP for Firefox
npm run compile          # Type check without emitting
```

### Backend (tidyfeed-backend/)
```bash
npm run dev              # Start local development server (wrangler dev)
npm run deploy           # Deploy to Cloudflare Workers production
npm run test             # Run Vitest tests
npm run cf-typegen       # Generate Cloudflare Worker types
```

**Backend testing:** Uses Vitest with `@cloudflare/vitest-pool-workers`. Tests are located in `test/` directory and run against local D1 database. Single test: `npm run test -- test/filename.test.ts`.

### Web Dashboard (tidyfeed-web/)
```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run pages:build      # Build for Cloudflare Pages deployment
npm run preview          # Preview Cloudflare Pages build locally
```

### Admin Dashboard (tidyfeed-admin/)
```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run pages:build      # Build for Cloudflare Pages deployment
```

### Python Workers (tidyfeed-bot-worker/, tidyfeed-python-worker/)
```bash
# Local development
python bot.py            # Run bot worker locally
python worker.py         # Run video worker locally
python main.py           # Run unified worker (both)

# Deployment
fly deploy               # Deploy to Fly.io production
fly apps list            # List deployed Fly.io apps
```

**Note:** Python workers require a `/data` volume for persistent state (cookies, processed IDs). Mount this volume when running locally or in production.

## Architecture

### Service Communication
- **User-facing services** (extension, web) authenticate via Google OAuth or JWT tokens
- **Service-to-service** communication uses `INTERNAL_SERVICE_KEY` environment variable
- All services connect to the same D1 database and R2 bucket for shared state
- CORS is configured for specific origins: `https://a.tidyfeed.app`, `https://tidyfeed.app`, `chrome-extension://`

### Authentication Flow
1. **Extension users**: Send Google ID token to `/auth/google` → receive JWT (stored in extension storage)
2. **Web users**: Redirect to `/auth/login/google` → OAuth flow → callback sets HttpOnly cookie → redirect to dashboard
3. **Admin users**: Email/password login at `/auth/login` → receive JWT
4. **Service workers**: Include `INTERNAL_SERVICE_KEY` in `X-Internal-Service-Key` header

### Database Schema (D1 SQLite)
Key tables and relationships:
- **users** - User accounts (Google OAuth)
- **saved_posts** - User-saved X posts (bookmarking)
- **tags** ← **post_tags** → **saved_posts** - Tagging system (many-to-many)
- **social_accounts** - Linked X/Twitter accounts (case-insensitive username lookups via `platform_username_lower`)
- **video_downloads** - Video download queue (status: pending → processing → completed/failed)
- **cached_tweets** - Tweet snapshots with R2 references
- **snapshot_notes** - User annotations on tweet text
- **bot_processed_mentions** - Bot deduplication tracking
- **system_settings** - Feature flags and configuration

**Schema file:** `tidyfeed-backend/schema.sql` (baseline schema after all migrations)

### Storage Strategy
- **D1 database**: Structured data (users, posts, tags, queue state)
- **R2 bucket**: Media files and snapshots
  - `images/{tweetId}/{media|avatar}/{filename}` - Cached images
  - `videos/{tweetId}/{filename}` - Downloaded videos
  - `snapshots/{tweetId}.html` - Tweet HTML snapshots
- **CDN caching**: 1-year immutable cache for images/videos via `Cache-Control` headers

### Backend Route Structure
Main routes in `tidyfeed-backend/src/index.ts`:
- `/auth/*` - Authentication endpoints (login, OAuth, logout)
- `/api/posts` - CRUD for saved posts
- `/api/tags` - Tag management
- `/api/tweets/tag` - Tag tweets (atomic operation)
- `/api/downloads` - Video download queue
- `/api/internal` - Internal service endpoints (bot worker)
- `/api/tweets` - Tweet caching operations
- `/api/images/*`, `/api/videos/*` - Media serving from R2
- `/api/ai` - AI-powered features (TikHub integration)
- `/api/notes` - Snapshot notes
- `/api/library` - Library/search features
- `/api/admin` - Admin-only endpoints

Modular routes are in `src/routes/` directory.

### Key Workflows

**Saving a post:**
1. Extension sends POST to `/api/posts` with tweet data
2. Backend inserts into `saved_posts` table
3. Background task (`waitUntil`) triggers `triggerCacheInBackground()`:
   - Fetches tweet details via TikHub API
   - Downloads images to R2
   - Generates HTML snapshot
   - Stores in `cached_tweets` table
   - Queues video downloads if applicable

**Video download:**
1. User requests download via extension/web
2. Backend creates row in `video_downloads` (status: pending)
3. Python worker polls `/api/internal/video-downloads/poll`
4. Worker downloads video via yt-dlp
5. Worker uploads to R2, updates status to "completed"
6. Extension/web polls for completion

**Bot interaction:**
1. Bot polls Twitter API for mentions
2. Parses commands (e.g., "save this tweet")
3. Calls `/api/internal/save-on-behalf` with target user
4. Backend validates linked social account and saves post

### Background Processing
Cloudflare Workers support background tasks via `waitUntil()`:
- Used for non-blocking operations after response is sent
- Example: Auto-caching tweets after saving
- Logs appear in Worker logs but don't delay response

## Configuration

### Cloudflare Workers (Backend)
Configuration in `wrangler.jsonc`:
- D1 database binding: `DB` → `tidyfeed-db`
- R2 bucket binding: `MEDIA_BUCKET` → `tidyfeed-media`
- Environment variables (set via `wrangler secret put`):
  - `JWT_SECRET` - JWT signing secret
  - `GOOGLE_CLIENT_ID` - OAuth client ID
  - `GOOGLE_CLIENT_SECRET` - OAuth client secret
  - `INTERNAL_SERVICE_KEY` - Service authentication
  - `TIKHUB_API_KEY` - Twitter API proxy
  - `BIGMODEL_API_KEY` - AI features (optional)
  - `WEB_APP_URL` - Landing page URL

### Python Workers
Environment variables in `Dockerfile` or `fly.toml`:
- `API_BASE_URL` - Backend API URL
- `INTERNAL_SERVICE_KEY` - Service authentication
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` - R2 credentials
- `R2_BUCKET_NAME` - R2 bucket name
- `BOT_COOKIES_PATH` - Bot auth state path
- `POLL_INTERVAL` - Queue polling interval

### Extension (WXT)
Configuration in `wxt.config.ts`:
- Manifest V3
- Permissions: `storage`, `cookies`
- Host permissions for X.com
- Custom content scripts for Twitter interaction

## Technology Stack

**Frontend/Extension:**
- WXT v0.20.6 (Chrome/Firefox extension framework)
- React 19 + TypeScript 5.9
- TailwindCSS 3.4 (extension), TailwindCSS 4 (web/admin)
- Radix UI components (web/admin)

**Backend:**
- Cloudflare Workers (serverless)
- Hono 4.11 (web framework)
- D1 (SQLite database)
- R2 (S3-compatible storage)
- jose 6.1 (JWT verification)

**Workers:**
- Python 3.10/3.11
- twikit (Twitter API)
- yt-dlp (video downloader)
- boto3 (R2 S3 client)

**Testing:**
- Vitest (backend tests)
- @cloudflare/vitest-pool-workers (Workers environment)

## Important Implementation Details

### Cookie Security
- Production cookies use `HttpOnly`, `Secure`, `SameSite=None`, `Domain=.tidyfeed.app`
- Development cookies use `HttpOnly`, `SameSite=Lax` (no Secure for localhost)
- Always set all these attributes consistently to avoid cookie rejection

### R2 Range Requests
Video serving supports HTTP Range requests for streaming:
- Uses `head()` to get size, then `get()` with range options
- Single fetch pattern (not double-fetch) for better performance
- Sets `Accept-Ranges: bytes`, `Content-Range`, `Content-Length` headers

### Case-Insensitive Username Lookups
Social accounts store both `platform_username` (original) and `platform_username_lower` (normalized) for case-insensitive queries:
```sql
-- Correct query pattern
SELECT * FROM social_accounts WHERE platform_username_lower = ?
```

### Atomic Database Operations
Use `DB.batch()` for multi-statement transactions:
```typescript
await c.env.DB.batch([
  c.env.DB.prepare(...),
  c.env.DB.prepare(...),
  c.env.DB.prepare(...)
]);
```

### Error Handling Patterns
- UNIQUE constraint violations → return "already exists" (not error)
- Foreign key violations → return 404 (parent not found)
- JWT verification failures → return 401 (unauthorized)
- Always use parameterized queries to prevent SQL injection

## Troubleshooting

**Worker won't start locally:**
- Ensure D1 database is created: `wrangler d1 create tidyfeed-db`
- Check `wrangler.jsonc` bindings match your local database ID
- Verify secrets are set: `wrangler secret list`

**Python worker can't access R2:**
- Verify R2 credentials are correct
- Check bucket name matches `wrangler.jsonc` binding
- Ensure worker has permission to access bucket

**Extension can't authenticate:**
- Check CORS configuration allows `chrome-extension://` origins
- Verify Google Client ID matches extension's origin
- Ensure JWT_SECRET is set in backend

**Tests fail locally:**
- Run `npm run cf-typegen` to regenerate types
- Check `vitest.config.mts` references correct `wrangler.jsonc`
- Ensure local D1 database schema is up to date
